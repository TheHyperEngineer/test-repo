# State Machine Visual Guide & Diagrams

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Execution Flow Sequence](#execution-flow-sequence)
3. [Class Relationship Diagrams](#class-relationship-diagrams)
4. [State Transition Examples](#state-transition-examples)
5. [Step Chain Visualization](#step-chain-visualization)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                             │
│  (REST Controller, Service Methods, Command Handlers)            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Initiates
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              State Machine Orchestration Layer                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ TransitionService (QuoteApprovalGraphTransitionService)   │  │
│  │ - Validates transition                                     │  │
│  │ - Fetches execution steps                                  │  │
│  │ - Orchestrates execution                                   │  │
│  │ - Persists state change                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌─────────┐  ┌─────────────┐  ┌──────────┐
    │ Fetcher │  │  Executor   │  │  Graph   │
    │ Service │  │  Component  │  │ (Vertex) │
    └─────────┘  └─────────────┘  └──────────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌─────────┐  ┌─────────────┐  ┌──────────┐
    │  Edge   │  │Step Chain   │  │ Context  │
    │ (Trans) │  │ (States)    │  │  (Data)  │
    └─────────┘  └─────────────┘  └──────────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌─────────┐  ┌─────────────┐  ┌──────────┐
    │ Step A  │→ │  Step B     │→ │ Step C   │→ null
    │ (Bean)  │  │ (Bean)      │  │ (Bean)   │
    └─────────┘  └─────────────┘  └──────────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌─────────┐  ┌─────────────┐  ┌──────────┐
    │Validate │  │ Call API    │  │Update DB │
    │  Data   │  │Integration  │  │ Status   │
    └─────────┘  └─────────────┘  └──────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
    ┌──────────────────────┐    ┌──────────────────┐
    │  Database Update     │    │ Return Context   │
    │ (Persist State)      │    │ (Success/Fail)   │
    └──────────────────────┘    └──────────────────┘
```

---

## Execution Flow Sequence

### Complete Transition Sequence Diagram

```
Controller/Service                 TransitionService              Graph Components
      │                                  │                              │
      │  executeTransition()              │                              │
      ├────────────────────────────────→ │                              │
      │                                  │                              │
      │                                  │ getTransitionLogic()         │
      │                                  ├─────────────────────────────→│
      │                                  │                              │
      │                                  │              ┌─ Lookup Edge
      │                                  │              │  src=A, dst=B
      │                                  │              │  return Edge
      │                                  │ ←─────────────────────────────┤
      │                                  │  (Edge with steps)            │
      │                                  │                              │
      │                                  │ extract Step Chain            │
      │                                  │ (State1, State2, ... null)   │
      │                                  │                              │
      │                                  │ execute(stepChain)           │
      │                                  ├──────────────────────────────→│
      │                                  │                              │
      │                                  │         Instantiate Step1
      │                                  │         Execute Step1
      │                                  │         ├─ Process Data
      │                                  │         ├─ Update Context
      │                                  │         └─ Set Completed Flag
      │                                  │                              │
      │                                  │         Instantiate Step2
      │                                  │         Execute Step2
      │                                  │         ├─ Process Data
      │                                  │         ├─ Update Context
      │                                  │         └─ Set Completed Flag
      │                                  │                              │
      │                                  │         ... Continue chain
      │                                  │                              │
      │                                  │ ←──────────────────────────────┤
      │                                  │  (Completed Context)         │
      │                                  │                              │
      │                           ┌─ Check if steps succeeded
      │                           │
      │                           │ if (context.isCompleted())
      │                           │   {
      │                           │      Fetch Entity from DB
      │                           │      Update entity.status = dest
      │                           │      Save to DB
      │                           │   }
      │                                  │                              │
      │ ←────────────────────────────────┤                              │
      │ (Context / Response)             │                              │
      │                                  │                              │
      ▼                                  ▼                              ▼
   Done                              Done                          Done
```

### Timeline View

```
Time →
│
├─ T0: Request arrives at controller
│  └─ Create empty context
│
├─ T1: Fetch transition logic from graph
│  └─ Graph lookup: O(1) via stream filter
│
├─ T2: Extract step chain from edge
│  └─ stepChain = edge.getStepExecutorEnum()
│
├─ T3: Execute step chain
│  ├─ T3a: Load Step1 bean from Spring
│  │  └─ Step1.executeStep(context)
│  │     ├─ Do business logic
│  │     └─ context.setCompleted(true/false)
│  │
│  ├─ T3b: Load Step2 bean from Spring
│  │  └─ Step2.executeStep(context)
│  │     ├─ Do business logic
│  │     └─ context.setCompleted(true/false)
│  │
│  └─ T3c: Continue until nextState == null
│
├─ T4: Check execution result
│  └─ if (context.isCompleted())
│
├─ T5: Update database
│  ├─ Find entity by ID
│  ├─ Set new state
│  └─ Save to repository
│
└─ T6: Return to caller
   └─ context / HTTP response
```

---

## Class Relationship Diagrams

### Core Graph Elements

```
┌──────────────────────┐
│   <<interface>>      │
│   GraphVertex        │
├──────────────────────┤
│ getAssociatedEdges() │
└──────────────────────┘
           △
           │
      ┌────┴─────────────────────┐
      │                           │
      │                    ┌──────────────────────┐
      │                    │ QuoteTransitionVertex│
      │                    ├──────────────────────┤
      │                    │ - node: OrderApproval│
      │                    │        State         │
      │                    ├──────────────────────┤
      │                    │ getAssociatedEdges() │
      │                    └──────────────────────┘
      │
      └─────────────────────────────────────────────


┌──────────────────────────┐
│    <<interface>>         │
│     GraphEdge            │
├──────────────────────────┤
│ getSource()              │
│ getDestination()         │
└──────────────────────────┘
           △
           │
      ┌────┴────────────────────────┐
      │                             │
      │  ┌──────────────────────────────────────────┐
      │  │  AbstractEdge                            │
      │  ├──────────────────────────────────────────┤
      │  │ - source: GraphVertex                    │
      │  │ - destination: GraphVertex               │
      │  ├──────────────────────────────────────────┤
      │  │ getSource()                              │
      │  │ getDestination()                         │
      │  └──────────────────────────────────────────┘
      │     △
      │     │ extends
      │     │
      │  ┌──────────────────────────────────────────┐
      │  │ QuoteTransitionEdge                      │
      │  ├──────────────────────────────────────────┤
      │  │ - stepExecutorEnum: State                │
      │  │ - failureVertexList: List<Vertex>       │
      │  ├──────────────────────────────────────────┤
      │  │ getStepExecutorEnum()                    │
      │  │ getFailureVertexList()                   │
      │  │ getSource(): QuoteTransitionVertex       │
      │  │ getDestination(): QuoteTransitionVertex  │
      │  └──────────────────────────────────────────┘
      │
      └──────────────────────────────────────────


┌──────────────────────────┐
│    <<interface>>         │
│       Graph              │
├──────────────────────────┤
│ getNodes()               │
│ getEdges()               │
│ setNodes()               │
│ setEdges()               │
│ print()                  │
└──────────────────────────┘
           △
           │
      ┌────┴────────────────────────┐
      │                             │
      │  ┌──────────────────────────────────────────┐
      │  │  AbstractGraph                           │
      │  ├──────────────────────────────────────────┤
      │  │ - nodes: List<GraphVertex>               │
      │  │ - edges: List<GraphEdge>                 │
      │  ├──────────────────────────────────────────┤
      │  │ getNodes()                               │
      │  │ getEdges()                               │
      │  └──────────────────────────────────────────┘
      │     △
      │     │ extends
      │     │
      │  ┌──────────────────────────────────────────┐
      │  │ QuoteTransitionGraph                     │
      │  ├──────────────────────────────────────────┤
      │  │ - exceptionEdges: List<Edge>             │
      │  │ - instance: QuoteTransitionGraph (static)│
      │  ├──────────────────────────────────────────┤
      │  │ createInstance(vertices, edges, exp)     │
      │  │ getInstance()                            │
      │  │ getExceptionEdges()                      │
      │  │ print()                                  │
      │  └──────────────────────────────────────────┘
      │
      └──────────────────────────────────────────
```

### State & Step Execution

```
┌──────────────────────────┐
│    <<interface>>         │
│       State              │
├──────────────────────────┤
│ getStateClass()          │
│ getNextState()           │
└──────────────────────────┘
           △
           │
    ┌──────┴──────────────────────────┐
    │                                 │
    │  ┌──────────────────────────────────────┐
    │  │  PendingApprovalFlow (enum)          │
    │  │  << implements State >>              │
    │  ├──────────────────────────────────────┤
    │  │ BUSINESS_APPROVAL_CHECK(Step, true)  │
    │  │ WORKFLOW_INITIATION(Step)            │
    │  ├──────────────────────────────────────┤
    │  │ getStateClass()                      │
    │  │ getNextState()                       │
    │  │ getInitialState()                    │
    │  │ setNextStep()                        │
    │  └──────────────────────────────────────┘
    │     │
    │     │ next ──→ next ──→ null
    │     │
    │     ├─→ BUSINESS_APPROVAL_CHECK
    │     │        │
    │     │        └→ getStateClass() →
    │     │           BusinessApprovalCheckStep
    │     │
    │     └─→ WORKFLOW_INITIATION
    │            │
    │            └→ getStateClass() →
    │               WorkflowStarterStep
    │
    └──────────────────────────────────


┌──────────────────────────┐
│    <<interface>>         │
│        Step<K,V>         │
├──────────────────────────┤
│ executeStep(K k): V      │
└──────────────────────────┘
           △
           │
      ┌────┴──────────────────────────┐
      │                               │
      │  ┌──────────────────────────────────┐
      │  │ AbstractOrderTransitionStep      │
      │  │ << abstract Component >>         │
      │  ├──────────────────────────────────┤
      │  │ executeStep(OrderTransitionCtx)  │
      │  └──────────────────────────────────┘
      │     △
      │     │ extends
      │     │
      │     ├─────────────────────────────┐
      │     │                             │
      │  ┌──────────────────┐  ┌──────────────────┐
      │  │ Business Appr.   │  │ Workflow Starter │
      │  │ CheckStep        │  │ Step             │
      │  ├──────────────────┤  ├──────────────────┤
      │  │ - cacheLoader    │  │ - propertyMgr    │
      │  │ - breService     │  │ - httpClient     │
      │  ├──────────────────┤  ├──────────────────┤
      │  │ executeStep()    │  │ executeStep()    │
      │  │ - Validate BRE   │  │ - Start Workflow │
      │  │ - Check Approval │  │ - Notify Pulsar  │
      │  │ - Set Context    │  │ - Update DB      │
      │  └──────────────────┘  └──────────────────┘
      │
      └────────────────────────────────


┌──────────────────────────┐
│    <<interface>>         │
│ StepExecutor<K,V>        │
├──────────────────────────┤
│ execute(State, K): V     │
└──────────────────────────┘
           △
           │
    ┌──────┴──────────────────────┐
    │                             │
    │  ┌───────────────────────────────────┐
    │  │ QuoteTransitionStepExecutor       │
    │  │ << Component >>                   │
    │  ├───────────────────────────────────┤
    │  │ execute(State, OrderTransCtx)     │
    │  │                                   │
    │  │ Algorithm:                        │
    │  │ for (State s = from; s!=null;     │
    │  │      s = s.getNextState()) {      │
    │  │   Step step = BeanUtil.getBean()  │
    │  │   ctx = step.executeStep(ctx)     │
    │  │ }                                 │
    │  └───────────────────────────────────┘
    │
    └──────────────────────────────
```

---

## State Transition Examples

### Order Management Example

```
Initial State: ENTITY_CREATED

Path 1: No Approvals Needed
┌─────────────────────────────────────────────────────────────┐
│ ENTITY_CREATED                                              │
│ └─ Transition: Check if approvals needed                    │
│    ├─ Step 1: BusinessApprovalCheckStep                    │
│    │  └─ Result: approvals == null → No approvals needed    │
│    └─ Step 2: WorkflowStarterStep                          │
│       └─ Result: Skip workflow, direct to approval          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Edge: ENTITY_CREATED → NO_APPROVAL
                      │ FailureVertices: [PENDING_APPROVAL]
                      ▼
              ┌──────────────────┐
              │  NO_APPROVAL     │  ◄─ Terminal State
              └──────────────────┘


Path 2: Approvals Needed
┌─────────────────────────────────────────────────────────────┐
│ ENTITY_CREATED                                              │
│ └─ Transition: Check if approvals needed                    │
│    ├─ Step 1: BusinessApprovalCheckStep                    │
│    │  └─ Result: approvals != null → Approvals needed       │
│    └─ Step 2: WorkflowStarterStep                          │
│       └─ Result: Create workflow instance in Pulsar        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Edge: ENTITY_CREATED → PENDING_APPROVAL
                      ▼
          ┌──────────────────────┐
          │ PENDING_APPROVAL     │
          │ (Awaiting Approval)  │
          └──┬────────────────┬──┬──────────────┐
             │                │  │              │
             │                │  │ [Reject]     │
             │                │  │              │
             │                │  └────────────→ REJECTED
             │                │
             │ [Approve]      │ [Edit & Resubmit]
             │                │
             │                └────────────→ APPROVED_WITH_EDIT
             │
             │ [Approve]
             ▼
      ┌────────────┐
      │ APPROVED   │  ◄─ Terminal State
      └────────────┘
```

### Leave Application Example (Alternative Domain)

```
DRAFT ─────────────→ SUBMITTED ─────────────→ MANAGER_APPROVED ─────→ HR_APPROVED
└─ Validate       │                      │                          └─ Terminal
└─ Notify Mgr     │                      └─ Notify HR
                  │
                  ├─ Manager Review
                  │  ├─ Approve
                  │  └─ Reject ──→ MANAGER_REJECTED ──→ Terminal
                  │
                  └─ Cancel ──→ CANCELLED ──→ Terminal
```

---

## Step Chain Visualization

### State Chain Execution Model

```
State Chain for PendingApprovalFlow:

1. Initial State: getInitialState()
   │
   ▼
2. ┌──────────────────────────────────┐
   │ BUSINESS_APPROVAL_CHECK (State 1)│
   │                                  │
   │ Implementation: Business Appr.    │
   │ CheckStep.class                   │
   │                                  │
   │ Execute Logic:                   │
   │ 1. Create QuoteApprovalBreModel  │
   │ 2. Call breService.check()       │
   │ 3. Set approvals in context      │
   │ 4. Return context                │
   │                                  │
   │ Success Flag: ✓ (Always completes)
   └────────┬─────────────────────────┘
            │
            │ getNextState()
            ▼
3. ┌──────────────────────────────────┐
   │ WORKFLOW_INITIATION (State 2)    │
   │                                  │
   │ Implementation: WorkflowStarter   │
   │ Step.class                        │
   │                                  │
   │ Execute Logic:                   │
   │ 1. Create workflow request       │
   │ 2. Call Pulsar API               │
   │ 3. Save workflow entity to DB    │
   │ 4. Return context                │
   │                                  │
   │ Success Flag: ✓ (Always completes)
   └────────┬─────────────────────────┘
            │
            │ getNextState()
            ▼
4. ┌──────────────────────────────────┐
   │ NULL (Terminal)                  │
   │                                  │
   │ Execution Chain Ends             │
   └────────────────────────────────────┘


Executor Loop:
┌─────────────────────────────────────────────────────┐
│ for (State s = initial; s != null; s = s.getNext()) │
│ {                                                   │
│   Step step = BeanUtil.getBean(s.getStateClass())  │
│   context = step.executeStep(context)              │
│   if (!context.isCompleted()) break;               │
│ }                                                   │
└─────────────────────────────────────────────────────┘
     │
     ├─ Iteration 1:
     │  └─ s = BUSINESS_APPROVAL_CHECK
     │     └─ Load BusinessApprovalCheckStep bean
     │     └─ Execute step
     │     └─ context.completed = true
     │
     ├─ Iteration 2:
     │  └─ s = WORKFLOW_INITIATION
     │     └─ Load WorkflowStarterStep bean
     │     └─ Execute step
     │     └─ context.completed = true
     │
     └─ Iteration 3:
        └─ s = null
        └─ Loop exits
```

---

## Complete Example: ENTITY_CREATED → PENDING_APPROVAL Transition

```
┌──────────────────────────────────────────────────────────────────┐
│                    1. Initiate Transition                        │
│                                                                   │
│ OrderTransitionExecutor.executeTransition(                       │
│   source: ENTITY_CREATED,                                        │
│   dest: PENDING_APPROVAL,                                        │
│   context: OrderTransitionContext                                │
│ )                                                                │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                  2. Fetch Transition Logic                       │
│                                                                   │
│ QuoteTransitionDataFetcher.getTransitionLogic(                  │
│   src: ENTITY_CREATED,                                           │
│   dest: PENDING_APPROVAL                                         │
│ )                                                                │
│                                                                   │
│ ├─ Access QuoteTransitionGraph.getInstance()                    │
│ ├─ Search graph.getEdges() for matching edge                    │
│ ├─ Filter: edge.source.node == ENTITY_CREATED                  │
│ ├─ Filter: edge.destination.node == PENDING_APPROVAL           │
│ └─ Return QuoteTransitionEdge                                   │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼ Edge Found:
                 │ src = ENTITY_CREATED
                 │ dst = PENDING_APPROVAL
                 │ stepExecutor = PendingApprovalFlow
                 │
┌──────────────────────────────────────────────────────────────────┐
│                3. Extract Step Chain                             │
│                                                                   │
│ State stepChain = edge.getStepExecutorEnum()                    │
│                                                                   │
│ Result:                                                          │
│ stepChain = PendingApprovalFlow.BUSINESS_APPROVAL_CHECK         │
│            ├─ getStateClass() → BusinessApprovalCheckStep.class │
│            └─ getNextState() → PendingApprovalFlow.             │
│                                WORKFLOW_INITIATION              │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│              4. Execute Step Chain                               │
│              (QuoteTransitionStepExecutor)                       │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ITERATION 1:                                                │ │
│ │                                                             │ │
│ │ currentState = BUSINESS_APPROVAL_CHECK                    │ │
│ │                                                             │ │
│ │ Step1 stepBean = BeanUtil.getBean(                        │ │
│ │   BusinessApprovalCheckStep.class                         │ │
│ │ )                                                          │ │
│ │                                                             │ │
│ │ ┌───────────────────────────────────────────────────────┐ │ │
│ │ │ BusinessApprovalCheckStep.executeStep(context)       │ │ │
│ │ │                                                       │ │ │
│ │ │ 1. Create QuoteApprovalBreModel                      │ │ │
│ │ │ 2. Set order model & products from context           │ │ │
│ │ │ 3. Call cacheLoader.getProductPriceList()           │ │ │
│ │ │ 4. Call breService.checkForBusinessApproval()       │ │ │
│ │ │ 5. If approvals == null:                            │ │ │
│ │ │    └─ context.setApprovals(null)                    │ │ │
│ │ │ 6. Else:                                             │ │ │
│ │ │    └─ context.setApprovals(approvals)               │ │ │
│ │ │ 7. Return context                                    │ │ │
│ │ │                                                       │ │ │
│ │ │ Result: context updated with approvals              │ │ │
│ │ └───────────────────────────────────────────────────────┘ │ │
│ │                                                             │ │
│ │ context.isTransactionStepCompleted() = true (assumed)     │ │
│ │                                                             │ │
│ │ nextState = currentState.getNextState()                  │ │
│ │           = WORKFLOW_INITIATION                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ITERATION 2:                                                │ │
│ │                                                             │ │
│ │ currentState = WORKFLOW_INITIATION                        │ │
│ │                                                             │ │
│ │ Step2 stepBean = BeanUtil.getBean(                        │ │
│ │   WorkflowStarterStep.class                              │ │
│ │ )                                                          │ │
│ │                                                             │ │
│ │ ┌───────────────────────────────────────────────────────┐ │ │
│ │ │ WorkflowStarterStep.executeStep(context)             │ │ │
│ │ │                                                       │ │ │
│ │ │ 1. Fetch OrderEntity by order ID                     │ │ │
│ │ │ 2. Create CreateApprovalWFRequestDTO                 │ │ │
│ │ │ 3. Set account, opportunity, quote details           │ │ │
│ │ │ 4. If approvals == null:                            │ │ │
│ │ │    └─ Set approvalRequired = false                  │ │ │
│ │ │ 5. Else:                                             │ │ │
│ │ │    └─ Set approvalRequired = true                   │ │ │
│ │ │    └─ Set products for approval                     │ │ │
│ │ │ 6. Call pulsarHttpClient.call() to create workflow  │ │ │
│ │ │ 7. Save VersionWorkFlowEntity to DB                 │ │ │
│ │ │ 8. Return context                                    │ │ │
│ │ │                                                       │ │ │
│ │ │ Result: Workflow created in Pulsar, entity saved     │ │ │
│ │ └───────────────────────────────────────────────────────┘ │ │
│ │                                                             │ │
│ │ context.isTransactionStepCompleted() = true               │ │
│ │                                                             │ │
│ │ nextState = currentState.getNextState()                  │ │
│ │           = null (Terminal)                             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ITERATION 3:                                                │ │
│ │                                                             │ │
│ │ currentState = null                                        │ │
│ │ → Loop condition fails, exit loop                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼ All steps complete, context returned
                 │
┌──────────────────────────────────────────────────────────────────┐
│                5. Persist State Change                           │
│                (Back in TransitionService)                       │
│                                                                   │
│ if (context.isTransactionStepCompleted()) {                      │
│                                                                   │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │ 1. Fetch OrderVersionEntity from DB                        │ │
│   │    by orderId & versionNumber                             │ │
│   │                                                            │ │
│   │ 2. Set approval status:                                    │ │
│   │    entity.setApprovalStatus(PENDING_APPROVAL)             │ │
│   │                                                            │ │
│   │ 3. Save to database:                                       │ │
│   │    orderVersionRepository.save(entity)                    │ │
│   │                                                            │ │
│   │ 4. Return context                                          │ │
│   └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ }                                                                │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                      6. Complete                                 │
│                                                                   │
│ ✓ Transition successful                                          │
│ ✓ Order moved from ENTITY_CREATED to PENDING_APPROVAL           │
│ ✓ Workflow instance created in Pulsar                           │
│ ✓ Database updated with new status                              │
│ ✓ Context returned to caller                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Context Data Flow

```
┌──────────────────────────────────────────────────────────┐
│ OrderTransitionContext (Initial)                         │
├──────────────────────────────────────────────────────────┤
│ - orderId: 123                                           │
│ - versionNumber: 1                                       │
│ - buyOrderModel: {order details}                         │
│ - approvals: null                                        │
│ - isTransactionStepCompleted: false                      │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ Step 1: BusinessApprovalCheck
        │                            │
        │ Input: context (as above)  │
        │                            │
        │ Processing:                │
        │ - Call BRE service         │
        │ - Check approvals needed   │
        │                            │
        │ Output: Modified context   │
        └─────────┬──────────────────┘
                  │
┌─────────────────▼──────────────────────────────────────┐
│ OrderTransitionContext (After Step 1)                 │
├───────────────────────────────────────────────────────┤
│ - orderId: 123                                        │
│ - versionNumber: 1                                    │
│ - buyOrderModel: {order details}                      │
│ - approvals: {list of products needing approval}    │
│ - isTransactionStepCompleted: true                    │
└────────────────────┬──────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ Step 2: WorkflowInitiation │
        │                            │
        │ Input: context (from step 1)
        │                            │
        │ Processing:                │
        │ - Build request DTO        │
        │ - Call Pulsar API          │
        │ - Create workflow          │
        │                            │
        │ Output: Modified context   │
        └─────────┬──────────────────┘
                  │
┌─────────────────▼──────────────────────────────────────┐
│ OrderTransitionContext (After Step 2)                 │
├───────────────────────────────────────────────────────┤
│ - orderId: 123                                        │
│ - versionNumber: 1                                    │
│ - buyOrderModel: {order details}                      │
│ - approvals: {list of products needing approval}    │
│ - isTransactionStepCompleted: true                    │
│                                                       │
│ + Database Effects:                                   │
│   └─ VersionWorkFlowEntity created & saved           │
│      (links workflow instance to order version)       │
└────────────────────┬──────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Return to TransitionService                            │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ if (context.isTransactionStepCompleted()) {         │ │
│ │   OrderVersionEntity entity = ...fetch...           │ │
│ │   entity.setApprovalStatus(PENDING_APPROVAL)        │ │
│ │   repository.save(entity)                           │ │
│ │ }                                                    │ │
│ └─────────────────────────────────────────────────────┘ │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Final Database State                                   │
│                                                         │
│ OrderVersionEntity:                                    │
│ - id: 123:1                                            │
│ - approvalStatus: PENDING_APPROVAL ✓ Updated          │
│                                                         │
│ VersionWorkFlowEntity:                                 │
│ - orderVersion: 123:1                                  │
│ - instanceId: pulsar-instance-001                      │
│ - workflowId: approval-workflow                        │
│ - status: COMPLETED                                    │
└─────────────────────────────────────────────────────────┘
```

---

## Summary

This visual guide helps you understand:

1. **Architecture**: How all components fit together
2. **Execution Flow**: The sequence of operations during a transition
3. **Class Relationships**: How classes inherit and compose
4. **State Transitions**: Valid paths through states
5. **Step Chains**: How steps execute sequentially
6. **Complete Example**: End-to-end execution of a real transition
7. **Data Flow**: How context data changes as it moves through steps

Use these diagrams alongside the detailed implementation guide for comprehensive understanding.


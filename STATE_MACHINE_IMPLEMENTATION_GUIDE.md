# State Machine Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Architecture Design](#architecture-design)
4. [Step-by-Step Implementation](#step-by-step-implementation)
5. [Example: Employee Leave Approval State Machine](#example-employee-leave-approval-state-machine)
6. [Common Patterns & Best Practices](#common-patterns--best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Overview

This guide explains how to build a **graph-based state machine** similar to the Order Management API's implementation. The state machine uses:
- **Graph structure** for state definitions and transitions
- **State pattern** for chainable execution steps
- **Chain of Responsibility** for step sequencing
- **Spring integration** for dependency injection and bean management

The resulting system is:
- ✅ Type-safe
- ✅ Extensible
- ✅ Database-persistent
- ✅ Async-capable
- ✅ Easy to maintain

---

## Prerequisites

### Required Knowledge
- Java 8+ (streams, enums, interfaces)
- Spring Framework (Components, Services, Beans, Autowiring)
- Object-oriented design patterns
- Basic graph theory (nodes, edges, vertices)
- Database fundamentals (JPA/Hibernate)

### Required Dependencies
```xml
<!-- Spring Framework -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>

<!-- Spring Data JPA -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>

<!-- Logging -->
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
</dependency>

<!-- SLF4J -->
<dependency>
    <groupId>org.slf4j</groupId>
    <artifactId>slf4j-api</artifactId>
</dependency>
```

---

## Architecture Design

Before implementing, understand the architecture pattern:

```
┌─────────────────────────────────────────────────────┐
│         Application Domain                           │
│  (e.g., Leave Approval, Invoice Processing, etc.)  │
└────────────┬────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────┐
│         State Machine Layer                          │
│  ┌──────────────────────────────────────────────┐   │
│  │    Graph-Based State Machine                 │   │
│  │  (Nodes=States, Edges=Transitions)           │   │
│  └──────────────────────────────────────────────┘   │
│                     │                                │
│  ┌──────────────────┼──────────────────┐            │
│  ▼                  ▼                   ▼            │
│ States           Transitions        State Chains    │
│ (Enums)          (Edges)            (Step Chains)   │
└──────────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────┐
│         Execution Layer                              │
│  ┌──────────────────────────────────────────────┐   │
│  │  Step Executor (Chain of Responsibility)     │   │
│  │  - Traverses step chain                      │   │
│  │  - Executes each step                        │   │
│  │  - Propagates context                        │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────┐
│         Data Persistence Layer                       │
│  ┌──────────────────────────────────────────────┐   │
│  │  Database (Store state transitions)          │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

---

## Step-by-Step Implementation

### Step 1: Define Your Domain States

**Objective**: Identify all possible states in your domain.

**Process**:
1. List all states that an entity can be in
2. Define state transitions (which states can follow which)
3. Document business rules for each transition

**Example (Leave Application)**:
```
States:
- DRAFT              → Initial state, applicant is filling form
- SUBMITTED          → Applicant has submitted, awaiting manager review
- MANAGER_APPROVED   → Manager approved, awaiting HR review
- MANAGER_REJECTED   → Manager rejected the application
- HR_APPROVED        → HR approved, leave is granted
- HR_REJECTED        → HR rejected the application
- CANCELLED          → Applicant cancelled the application
```

**File**: `com.example.leavemanagement.constants.database.LeaveApplicationState.java`

```java
package com.example.leavemanagement.constants.database;

public enum LeaveApplicationState {
    DRAFT,
    SUBMITTED,
    MANAGER_APPROVED,
    MANAGER_REJECTED,
    HR_APPROVED,
    HR_REJECTED,
    CANCELLED
}
```

**Best Practices**:
- Use UPPER_SNAKE_CASE for enum names
- Ensure states are mutually exclusive
- Keep the number of states manageable (typically 5-12)
- Consider failed/error states explicitly

---

### Step 2: Create Graph Core Elements

**Objective**: Build the foundational graph data structure classes.

#### 2a. Create Graph Interfaces

**File**: `com.example.leavemanagement.util.graphs.coreelements.GraphVertex.java`

```java
package com.example.leavemanagement.util.graphs.coreelements;

import java.util.List;

public interface GraphVertex {
    List<GraphEdge> getAssociatedEdges();
}
```

**File**: `com.example.leavemanagement.util.graphs.coreelements.GraphEdge.java`

```java
package com.example.leavemanagement.util.graphs.coreelements;

public interface GraphEdge {
    GraphVertex getSource();
    GraphVertex getDestination();
}
```

**File**: `com.example.leavemanagement.util.graphs.coreelements.Graph.java`

```java
package com.example.leavemanagement.util.graphs.coreelements;

import java.util.List;

public interface Graph {
    List getNodes();
    List getEdges();
    void setNodes(List nodeList);
    void setEdges(List edgeList);
    void print();
}
```

#### 2b. Create Abstract Base Classes

**File**: `com.example.leavemanagement.util.graphs.coreelements.AbstractGraph.java`

```java
package com.example.leavemanagement.util.graphs.coreelements;

import java.util.ArrayList;
import java.util.List;

public abstract class AbstractGraph implements Graph {
    protected List<GraphVertex> nodes;
    protected List<GraphEdge> edges;

    @Override
    public void print() {
        // Optional: Implement graph visualization
    }

    @Override
    public List getNodes() {
        return new ArrayList(nodes);
    }

    @Override
    public List getEdges() {
        return new ArrayList(edges);
    }

    @Override
    public void setNodes(List nodeList) {
        nodes = new ArrayList<>();
        nodes.addAll(nodeList);
    }

    @Override
    public void setEdges(List edgeList) {
        edges = new ArrayList<>();
        edges.addAll(edgeList);
    }
}
```

**File**: `com.example.leavemanagement.util.graphs.coreelements.AbstractEdge.java`

```java
package com.example.leavemanagement.util.graphs.coreelements;

public abstract class AbstractEdge implements GraphEdge {
    private GraphVertex source;
    private GraphVertex destination;

    public GraphVertex getSource() {
        return source;
    }

    public void setSource(GraphVertex source) {
        this.source = source;
    }

    public GraphVertex getDestination() {
        return destination;
    }

    public void setDestination(GraphVertex destination) {
        this.destination = destination;
    }
}
```

---

### Step 3: Create Domain-Specific Graph Classes

**Objective**: Create vertex and edge classes specific to your domain.

**File**: `com.example.leavemanagement.service.statetransition.LeaveApplicationVertex.java`

```java
package com.example.leavemanagement.service.statetransition;

import com.example.leavemanagement.constants.database.LeaveApplicationState;
import com.example.leavemanagement.util.graphs.coreelements.GraphVertex;
import com.example.leavemanagement.util.graphs.coreelements.GraphEdge;
import lombok.Data;

import java.util.List;

@Data
public class LeaveApplicationVertex implements GraphVertex {
    
    private LeaveApplicationState state;

    public LeaveApplicationVertex(LeaveApplicationState state) {
        this.state = state;
    }

    @Override
    public List<GraphEdge> getAssociatedEdges() {
        return null;
    }
}
```

**File**: `com.example.leavemanagement.service.statetransition.LeaveApplicationEdge.java`

```java
package com.example.leavemanagement.service.statetransition;

import com.example.leavemanagement.service.common.State;
import com.example.leavemanagement.util.graphs.coreelements.AbstractEdge;
import java.util.List;

public class LeaveApplicationEdge extends AbstractEdge {
    
    private State stepExecutorEnum;  // The state/step chain to execute
    private List<LeaveApplicationVertex> failureVertexList;  // Fallback states on error

    public State getStepExecutorEnum() {
        return stepExecutorEnum;
    }

    public void setStepExecutorEnum(State stepExecutorEnum) {
        this.stepExecutorEnum = stepExecutorEnum;
    }

    public List<LeaveApplicationVertex> getFailureVertexList() {
        return failureVertexList;
    }

    public void setFailureVertexList(List<LeaveApplicationVertex> failureVertexList) {
        this.failureVertexList = failureVertexList;
    }

    @Override
    public LeaveApplicationVertex getSource() {
        return (LeaveApplicationVertex) super.getSource();
    }

    @Override
    public LeaveApplicationVertex getDestination() {
        return (LeaveApplicationVertex) super.getDestination();
    }
}
```

**File**: `com.example.leavemanagement.service.statetransition.LeaveApplicationGraph.java`

```java
package com.example.leavemanagement.service.statetransition;

import com.example.leavemanagement.util.graphs.coreelements.AbstractGraph;
import lombok.extern.slf4j.Slf4j;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Slf4j
public class LeaveApplicationGraph extends AbstractGraph {
    
    private List<LeaveApplicationEdge> exceptionEdges;
    private static LeaveApplicationGraph instance = null;

    private LeaveApplicationGraph(List<LeaveApplicationVertex> vertices, 
                                 List<LeaveApplicationEdge> edges,
                                 List<LeaveApplicationEdge> exceptionEdgeList) {
        exceptionEdges = new ArrayList<>();
        setNodes(Collections.unmodifiableList(vertices));
        setEdges(Collections.unmodifiableList(edges));
        exceptionEdges.addAll(Collections.unmodifiableList(exceptionEdgeList));
    }

    public static LeaveApplicationGraph createInstance(List<LeaveApplicationVertex> vertices, 
                                                      List<LeaveApplicationEdge> edges,
                                                      List<LeaveApplicationEdge> exceptionEdgeList) {
        if (instance == null) {
            instance = new LeaveApplicationGraph(vertices, edges, exceptionEdgeList);
        }
        return instance;
    }

    public static LeaveApplicationGraph getInstance() {
        return instance;
    }

    public List<LeaveApplicationEdge> getExceptionEdges() {
        return new ArrayList<>(exceptionEdges);
    }

    @Override
    public void print() {
        log.info("Leave Application Graph:");
        log.info("Vertices: {}", getNodes());
        log.info("Edges: {}", getEdges());
    }
}
```

---

### Step 4: Create State and Step Interfaces

**Objective**: Define contracts for states and execution steps.

**File**: `com.example.leavemanagement.service.common.State.java`

```java
package com.example.leavemanagement.service.common;

public interface State {
    /**
     * Returns the Step class to execute for this state
     */
    Class<? extends Step> getStateClass();

    /**
     * Returns the next state in the execution chain
     */
    State getNextState();
}
```

**File**: `com.example.leavemanagement.service.common.Step.java`

```java
package com.example.leavemanagement.service.common;

/**
 * Generic step executor interface
 * K = Input type (context)
 * V = Output type (usually same as input)
 */
public interface Step<K, V> {
    V executeStep(K context);
}
```

**File**: `com.example.leavemanagement.service.common.StepExecutor.java`

```java
package com.example.leavemanagement.service.common;

/**
 * Executor that runs a chain of steps
 * K = Input type
 * V = Output type
 */
public interface StepExecutor<K, V> {
    V execute(State fromState, K input);
}
```

---

### Step 5: Create State Implementations (Step Chains)

**Objective**: Define the actual steps that execute during transitions.

**File**: `com.example.leavemanagement.constants.TransactionState.SubmissionFlow.java`

```java
package com.example.leavemanagement.constants.TransactionState;

import com.example.leavemanagement.service.common.State;
import com.example.leavemanagement.service.common.Step;
import com.example.leavemanagement.service.step.ValidateLeaveStep;
import com.example.leavemanagement.service.step.NotifyManagerStep;
import java.util.Arrays;

public enum SubmissionFlow implements State {
    
    VALIDATE_LEAVE(ValidateLeaveStep.class, true),
    NOTIFY_MANAGER(NotifyManagerStep.class);

    static {
        VALIDATE_LEAVE.setNextStep(NOTIFY_MANAGER);
        NOTIFY_MANAGER.setNextStep(null);  // Terminal state
    }

    SubmissionFlow(Class<? extends Step> stepClass, boolean isInitial) {
        this.stepClass = stepClass;
        this.isInitialState = isInitial;
    }

    SubmissionFlow(Class<? extends Step> stepClass) {
        this.stepClass = stepClass;
        this.isInitialState = false;
    }

    private Class<? extends Step> stepClass;
    private SubmissionFlow nextStep;
    private boolean isInitialState = false;

    @Override
    public Class<? extends Step> getStateClass() {
        return stepClass;
    }

    @Override
    public State getNextState() {
        return nextStep;
    }

    public static State getInitialState() {
        return Arrays.stream(values())
            .filter(x -> x.isInitialState)
            .findFirst()
            .orElse(null);
    }

    public void setNextStep(SubmissionFlow nextStep) {
        this.nextStep = nextStep;
    }
}
```

**Key Concepts**:
- Create an enum for each transition type
- Static block chains steps together
- Mark one state as `isInitialState = true`
- `getInitialState()` provides entry point to the chain

---

### Step 6: Create Concrete Step Implementations

**Objective**: Implement actual business logic for each step.

**File**: `com.example.leavemanagement.service.step.AbstractLeaveStep.java`

```java
package com.example.leavemanagement.service.step;

import com.example.leavemanagement.service.common.Step;
import org.springframework.stereotype.Component;

@Component
public abstract class AbstractLeaveStep implements Step<LeaveApplicationContext, LeaveApplicationContext> {
}
```

**File**: `com.example.leavemanagement.service.step.LeaveApplicationContext.java`

```java
package com.example.leavemanagement.service.step;

import com.example.leavemanagement.controller.model.LeaveApplicationModel;
import lombok.Data;

@Data
public class LeaveApplicationContext {
    
    private Integer applicationId;
    private Integer versionNumber;
    private boolean isTransactionStepCompleted = false;
    private LeaveApplicationModel leaveApplication;
    private String validationMessage;  // Error messages
    private String managerEmail;
    
    // Add any context needed for step execution
}
```

**File**: `com.example.leavemanagement.service.step.ValidateLeaveStep.java`

```java
package com.example.leavemanagement.service.step;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import java.time.LocalDate;

@Slf4j
@Component
public class ValidateLeaveStep extends AbstractLeaveStep {
    
    @Override
    public LeaveApplicationContext executeStep(LeaveApplicationContext context) {
        log.info("Validating leave application: {}", context.getApplicationId());
        
        LeaveApplicationModel leaveApp = context.getLeaveApplication();
        
        // Validation 1: Check dates
        if (leaveApp.getStartDate().isAfter(leaveApp.getEndDate())) {
            context.setValidationMessage("Start date cannot be after end date");
            context.setTransactionStepCompleted(false);
            return context;
        }
        
        // Validation 2: Check duration
        long days = leaveApp.getEndDate().toEpochDay() - leaveApp.getStartDate().toEpochDay();
        if (days > 30) {
            context.setValidationMessage("Leave duration cannot exceed 30 days");
            context.setTransactionStepCompleted(false);
            return context;
        }
        
        // Validation 3: Check leave balance
        if (leaveApp.getLeaveBalance() < days) {
            context.setValidationMessage("Insufficient leave balance");
            context.setTransactionStepCompleted(false);
            return context;
        }
        
        log.info("Leave validation passed");
        context.setTransactionStepCompleted(true);
        return context;
    }
}
```

**File**: `com.example.leavemanagement.service.step.NotifyManagerStep.java`

```java
package com.example.leavemanagement.service.step;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class NotifyManagerStep extends AbstractLeaveStep {
    
    @Override
    public LeaveApplicationContext executeStep(LeaveApplicationContext context) {
        log.info("Notifying manager for leave application: {}", context.getApplicationId());
        
        // Send email to manager
        String managerEmail = context.getManagerEmail();
        String subject = "Leave Application Pending Approval";
        String body = "Please review and approve/reject leave application #" + context.getApplicationId();
        
        // sendEmail(managerEmail, subject, body);  // Integration with email service
        
        log.info("Manager notified at: {}", managerEmail);
        context.setTransactionStepCompleted(true);
        return context;
    }
}
```

---

### Step 7: Create Graph Builder

**Objective**: Construct the complete state transition graph.

**File**: `com.example.leavemanagement.service.statetransition.LeaveApplicationGraphBuilder.java`

```java
package com.example.leavemanagement.service.statetransition;

import com.example.leavemanagement.constants.TransactionState.SubmissionFlow;
import com.example.leavemanagement.constants.TransactionState.ApprovalFlow;
import com.example.leavemanagement.constants.database.LeaveApplicationState;
import com.example.leavemanagement.service.common.State;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Slf4j
public class LeaveApplicationGraphBuilder {
    
    public LeaveApplicationGraph buildLeaveApplicationGraph() {
        List<LeaveApplicationVertex> stateNodes = buildStateNodes();
        List<LeaveApplicationEdge> transitionEdges = buildTransitionEdges(stateNodes);
        List<LeaveApplicationEdge> exceptionEdges = buildExceptionEdges(stateNodes);
        
        LeaveApplicationGraph graph = LeaveApplicationGraph.createInstance(
            stateNodes, 
            transitionEdges, 
            exceptionEdges
        );
        
        log.info("Leave Application Graph constructed with {} states and {} transitions", 
                stateNodes.size(), transitionEdges.size());
        
        return graph;
    }
    
    private List<LeaveApplicationVertex> buildStateNodes() {
        return Arrays.stream(LeaveApplicationState.values())
            .map(this::createNode)
            .collect(Collectors.toList());
    }
    
    private LeaveApplicationVertex createNode(LeaveApplicationState state) {
        return new LeaveApplicationVertex(state);
    }
    
    private List<LeaveApplicationEdge> buildTransitionEdges(List<LeaveApplicationVertex> nodes) {
        Map<LeaveApplicationState, LeaveApplicationVertex> vertexMap = 
            getStateVertexMap(nodes);
        List<LeaveApplicationEdge> edges = new ArrayList<>();
        
        // DRAFT -> SUBMITTED: Validate and notify manager
        edges.add(createEdge(
            vertexMap.get(LeaveApplicationState.DRAFT),
            vertexMap.get(LeaveApplicationState.SUBMITTED),
            SubmissionFlow.getInitialState(),
            Collections.emptyList()
        ));
        
        // SUBMITTED -> MANAGER_APPROVED: Manager approves
        edges.add(createEdge(
            vertexMap.get(LeaveApplicationState.SUBMITTED),
            vertexMap.get(LeaveApplicationState.MANAGER_APPROVED),
            ApprovalFlow.getInitialState(),
            Collections.emptyList()
        ));
        
        // SUBMITTED -> MANAGER_REJECTED: Manager rejects
        edges.add(createEdge(
            vertexMap.get(LeaveApplicationState.SUBMITTED),
            vertexMap.get(LeaveApplicationState.MANAGER_REJECTED),
            ApprovalFlow.getInitialState(),
            Collections.emptyList()
        ));
        
        // MANAGER_APPROVED -> HR_APPROVED: HR approves
        edges.add(createEdge(
            vertexMap.get(LeaveApplicationState.MANAGER_APPROVED),
            vertexMap.get(LeaveApplicationState.HR_APPROVED),
            ApprovalFlow.getInitialState(),
            Collections.emptyList()
        ));
        
        // MANAGER_APPROVED -> HR_REJECTED: HR rejects
        edges.add(createEdge(
            vertexMap.get(LeaveApplicationState.MANAGER_APPROVED),
            vertexMap.get(LeaveApplicationState.HR_REJECTED),
            ApprovalFlow.getInitialState(),
            Collections.emptyList()
        ));
        
        // SUBMITTED -> CANCELLED: Applicant cancels before approval
        edges.add(createEdge(
            vertexMap.get(LeaveApplicationState.SUBMITTED),
            vertexMap.get(LeaveApplicationState.CANCELLED),
            ApprovalFlow.getInitialState(),
            Collections.emptyList()
        ));
        
        return edges;
    }
    
    private List<LeaveApplicationEdge> buildExceptionEdges(List<LeaveApplicationVertex> nodes) {
        Map<LeaveApplicationState, LeaveApplicationVertex> vertexMap = 
            getStateVertexMap(nodes);
        List<LeaveApplicationEdge> edges = new ArrayList<>();
        
        // Exception: If submission fails, go back to DRAFT
        edges.add(createEdge(
            vertexMap.get(LeaveApplicationState.DRAFT),
            vertexMap.get(LeaveApplicationState.DRAFT),
            SubmissionFlow.getInitialState(),
            Collections.emptyList()
        ));
        
        return edges;
    }
    
    private LeaveApplicationEdge createEdge(
        LeaveApplicationVertex source,
        LeaveApplicationVertex destination,
        State state,
        List<LeaveApplicationVertex> failureVertices) {
        
        LeaveApplicationEdge edge = new LeaveApplicationEdge();
        edge.setSource(source);
        edge.setDestination(destination);
        edge.setStepExecutorEnum(state);
        edge.setFailureVertexList(failureVertices);
        return edge;
    }
    
    private Map<LeaveApplicationState, LeaveApplicationVertex> getStateVertexMap(
        List<LeaveApplicationVertex> nodes) {
        return nodes.stream()
            .collect(Collectors.toMap(LeaveApplicationVertex::getState, Function.identity()));
    }
}
```

**Key Points**:
- Define all valid transitions in `buildTransitionEdges()`
- Associate step chains with transitions via `setStepExecutorEnum()`
- Define fallback transitions in `buildExceptionEdges()`

---

### Step 8: Create Data Fetcher

**Objective**: Look up transitions in the graph.

**File**: `com.example.leavemanagement.service.statetransition.LeaveApplicationTransitionFetcher.java`

```java
package com.example.leavemanagement.service.statetransition;

import com.example.leavemanagement.constants.database.LeaveApplicationState;
import com.example.leavemanagement.exceptions.StateTransitionException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
@Slf4j
public class LeaveApplicationTransitionFetcher {
    
    public LeaveApplicationEdge getTransitionLogic(
        LeaveApplicationState source,
        LeaveApplicationState destination) {
        
        LeaveApplicationGraph graph = LeaveApplicationGraph.getInstance();
        return getEdge(source, destination, graph.getEdges());
    }
    
    public LeaveApplicationEdge getErrorTransitionLogic(
        LeaveApplicationState source,
        LeaveApplicationState destination) {
        
        LeaveApplicationGraph graph = LeaveApplicationGraph.getInstance();
        return getEdge(source, destination, graph.getExceptionEdges());
    }
    
    private LeaveApplicationEdge getEdge(
        LeaveApplicationState source,
        LeaveApplicationState destination,
        List<LeaveApplicationEdge> edgeList) {
        
        Optional<LeaveApplicationEdge> edge = edgeList.stream()
            .filter(e -> e.getSource().getState().equals(source) &&
                        e.getDestination().getState().equals(destination))
            .findFirst();
        
        return edge.orElseThrow(() -> new StateTransitionException(
            "Invalid transition from " + source + " to " + destination,
            HttpStatus.BAD_REQUEST
        ));
    }
}
```

---

### Step 9: Create Step Executor

**Objective**: Execute the chain of steps for a transition.

**File**: `com.example.leavemanagement.service.step.LeaveApplicationStepExecutor.java`

```java
package com.example.leavemanagement.service.step;

import com.example.leavemanagement.service.common.State;
import com.example.leavemanagement.service.common.StepExecutor;
import com.example.leavemanagement.util.BeanUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class LeaveApplicationStepExecutor implements 
    StepExecutor<LeaveApplicationContext, LeaveApplicationContext> {
    
    @Override
    public LeaveApplicationContext execute(
        State fromState,
        LeaveApplicationContext context) {
        
        log.info("Starting step execution chain from state: {}", 
                fromState.getStateClass().getSimpleName());
        
        // Traverse the state chain
        for (State currentState = fromState; currentState != null; 
             currentState = currentState.getNextState()) {
            
            log.info("Executing step: {}", currentState.getStateClass().getSimpleName());
            
            // Get the step bean from Spring context
            AbstractLeaveStep step = (AbstractLeaveStep) BeanUtil.getBean(
                currentState.getStateClass()
            );
            
            // Execute the step
            context = step.executeStep(context);
            
            // Check if step failed
            if (!context.isTransactionStepCompleted()) {
                log.warn("Step {} failed", currentState.getStateClass().getSimpleName());
                break;
            }
            
            log.info("Step {} completed successfully", 
                    currentState.getStateClass().getSimpleName());
        }
        
        log.info("Step execution chain completed");
        return context;
    }
}
```

---

### Step 10: Create Transition Service

**Objective**: Orchestrate the complete state transition workflow.

**File**: `com.example.leavemanagement.service.statetransition.LeaveApplicationTransitionService.java`

```java
package com.example.leavemanagement.service.statetransition;

public interface LeaveApplicationTransitionService {
    
    void executeTransitionAsync(
        LeaveApplicationState source,
        LeaveApplicationState destination,
        LeaveApplicationContext context);
    
    LeaveApplicationContext executeTransition(
        LeaveApplicationState source,
        LeaveApplicationState destination,
        LeaveApplicationContext context);
}
```

**File**: `com.example.leavemanagement.service.statetransition.LeaveApplicationTransitionServiceImpl.java`

```java
package com.example.leavemanagement.service.statetransition;

import com.example.leavemanagement.constants.database.LeaveApplicationState;
import com.example.leavemanagement.dataaccess.repositories.LeaveApplicationRepository;
import com.example.leavemanagement.service.step.LeaveApplicationContext;
import com.example.leavemanagement.service.step.LeaveApplicationStepExecutor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
@Transactional(propagation = Propagation.REQUIRES_NEW)
public class LeaveApplicationTransitionServiceImpl implements LeaveApplicationTransitionService {
    
    @Autowired
    private LeaveApplicationStepExecutor stepExecutor;
    
    @Autowired
    private LeaveApplicationTransitionFetcher transitionFetcher;
    
    @Autowired
    private LeaveApplicationRepository leaveApplicationRepository;
    
    @Async("asyncProcessExecutor")
    @Override
    public void executeTransitionAsync(
        LeaveApplicationState source,
        LeaveApplicationState destination,
        LeaveApplicationContext context) {
        
        executeTransition(source, destination, context);
    }
    
    @Override
    public LeaveApplicationContext executeTransition(
        LeaveApplicationState source,
        LeaveApplicationState destination,
        LeaveApplicationContext context) {
        
        log.info("Transitioning leave application {} from {} to {}",
                context.getApplicationId(), source, destination);
        
        try {
            // Step 1: Fetch the transition logic (edge with steps)
            LeaveApplicationEdge transitionEdge = 
                transitionFetcher.getTransitionLogic(source, destination);
            
            log.info("Found transition with steps: {}", 
                    transitionEdge.getStepExecutorEnum().getClass().getSimpleName());
            
            // Step 2: Execute the step chain
            context = stepExecutor.execute(
                transitionEdge.getStepExecutorEnum(),
                context
            );
            
            // Step 3: If successful, persist state change
            if (context.isTransactionStepCompleted()) {
                LeaveApplicationEntity entity = 
                    leaveApplicationRepository.findById(context.getApplicationId())
                    .orElseThrow(() -> new RuntimeException("Application not found"));
                
                entity.setApplicationStatus(destination);
                leaveApplicationRepository.save(entity);
                
                log.info("Leave application {} successfully transitioned to {}",
                        context.getApplicationId(), destination);
            } else {
                log.warn("Transition failed for application {}: {}",
                        context.getApplicationId(), context.getValidationMessage());
                
                // Optionally handle failure: attempt fallback transition
                // LeaveApplicationEdge fallbackEdge = 
                //     transitionFetcher.getErrorTransitionLogic(source, ...);
            }
            
        } catch (Exception e) {
            log.error("Error during transition of application {}", 
                    context.getApplicationId(), e);
            throw e;
        }
        
        return context;
    }
}
```

---

### Step 11: Create Controller/Entry Point

**Objective**: Expose state machine via REST API or service method.

**File**: `com.example.leavemanagement.controller.LeaveApplicationController.java`

```java
package com.example.leavemanagement.controller;

import com.example.leavemanagement.constants.database.LeaveApplicationState;
import com.example.leavemanagement.service.statetransition.LeaveApplicationTransitionService;
import com.example.leavemanagement.service.step.LeaveApplicationContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/leave-applications")
@Slf4j
public class LeaveApplicationController {
    
    @Autowired
    private LeaveApplicationTransitionService transitionService;
    
    @PostMapping("/{id}/submit")
    public ResponseEntity<?> submitApplication(@PathVariable Integer id) {
        log.info("Submitting leave application: {}", id);
        
        LeaveApplicationContext context = new LeaveApplicationContext();
        context.setApplicationId(id);
        // Populate context with order data from database
        
        transitionService.executeTransition(
            LeaveApplicationState.DRAFT,
            LeaveApplicationState.SUBMITTED,
            context
        );
        
        return ResponseEntity.ok("Application submitted successfully");
    }
    
    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approveApplication(
        @PathVariable Integer id,
        @RequestParam String role) {  // manager or hr
        
        LeaveApplicationContext context = new LeaveApplicationContext();
        context.setApplicationId(id);
        
        LeaveApplicationState destination = role.equals("manager") ?
            LeaveApplicationState.MANAGER_APPROVED :
            LeaveApplicationState.HR_APPROVED;
        
        transitionService.executeTransition(
            LeaveApplicationState.SUBMITTED,
            destination,
            context
        );
        
        return ResponseEntity.ok("Application approved successfully");
    }
}
```

---

### Step 12: Initialize Graph on Application Startup

**Objective**: Build the graph when the application starts.

**File**: `com.example.leavemanagement.config.StateMachineInitializer.java`

```java
package com.example.leavemanagement.config;

import com.example.leavemanagement.service.statetransition.LeaveApplicationGraphBuilder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@Slf4j
public class StateMachineInitializer {
    
    @Autowired
    private LeaveApplicationGraphBuilder graphBuilder;
    
    @Bean
    public ApplicationRunner initializeStateMachine() {
        return args -> {
            log.info("Initializing Leave Application State Machine Graph");
            graphBuilder.buildLeaveApplicationGraph();
            log.info("State Machine Graph initialized successfully");
        };
    }
}
```

---

## Example: Employee Leave Approval State Machine

### Complete Flow Diagram

```
┌─────────────┐
│   DRAFT     │  ← Initial state
└──────┬──────┘
       │ [Submit with validation]
       │ Steps: ValidateLeaveStep → NotifyManagerStep
       ▼
┌──────────────────┐
│   SUBMITTED      │
└──┬────────────┬──┬──────────────┐
   │            │  │              │
   │            │  │ [Reject]     │
   │            │  └──► MANAGER_REJECTED
   │            │
   │ [Approve]  │ [Cancel]
   │            │
   │            └──► CANCELLED
   │
   ▼
┌─────────────────────┐
│ MANAGER_APPROVED    │
└────┬──────────┬─────┘
     │          │
     │          │ [Reject]
     │          └──► HR_REJECTED
     │
     │ [Approve]
     ▼
┌──────────────┐
│ HR_APPROVED  │  ← Terminal State
└──────────────┘
```

### State-to-State Transitions Table

| From | To | Steps | Conditions |
|------|-----|-------|------------|
| DRAFT | SUBMITTED | ValidateLeaveStep → NotifyManagerStep | Dates valid, balance sufficient |
| SUBMITTED | MANAGER_APPROVED | ManagerApprovalStep | Manager approval |
| SUBMITTED | MANAGER_REJECTED | NotifyApplicantStep | Manager rejection |
| SUBMITTED | CANCELLED | UpdateLeaveBalanceStep | Applicant cancellation |
| MANAGER_APPROVED | HR_APPROVED | HRApprovalStep → UpdateLeaveBalanceStep | HR approval |
| MANAGER_APPROVED | HR_REJECTED | NotifyApplicantStep | HR rejection |

---

## Common Patterns & Best Practices

### 1. **State Naming Convention**
```
✓ GOOD:  PENDING_APPROVAL, MANAGER_REJECTED, HR_APPROVED
✗ BAD:   pending, approved1, state2
```

### 2. **Step Organization**
```
✓ One responsibility per step
✓ Small, testable steps
✓ Steps are idempotent (safe to retry)
✗ God steps doing too much
```

### 3. **Error Handling**
```java
// ✓ GOOD: Set context flag for step failure
context.setTransactionStepCompleted(false);
context.setValidationMessage("Specific error reason");

// ✗ BAD: Throwing exceptions from steps
throw new RuntimeException("Something failed");
```

### 4. **Step Chaining**
```java
// ✓ GOOD: Clear chain in static block
static {
    VALIDATE.setNextStep(NOTIFY);
    NOTIFY.setNextStep(null);
}

// ✗ BAD: Hidden dependencies, unclear chain
```

### 5. **Database Persistence**
```java
// ✓ GOOD: Update only after successful execution
if (context.isTransactionStepCompleted()) {
    entity.setState(destination);
    repository.save(entity);
}

// ✗ BAD: Update during step execution (inconsistent state)
```

### 6. **Testing**
```java
// ✓ GOOD: Test steps independently
@Test
public void testValidateLeaveStep() {
    ValidateLeaveStep step = new ValidateLeaveStep();
    LeaveApplicationContext context = new LeaveApplicationContext();
    // Setup test data
    context = step.executeStep(context);
    assertEquals(true, context.isTransactionStepCompleted());
}

// ✓ GOOD: Test transitions
@Test
public void testDraftToSubmittedTransition() {
    // Setup context
    // Call transition service
    // Verify state change in database
}
```

### 7. **Async Execution**
```java
// For long-running steps, use async:
@Async("asyncProcessExecutor")
public void executeTransitionAsync(...) {
    // This runs in a separate thread
}

// Configure executor in TaskExecutors.java:
@Bean(name = "asyncProcessExecutor")
public Executor asyncProcessExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(5);
    executor.setMaxPoolSize(10);
    executor.initialize();
    return executor;
}
```

### 8. **Logging Best Practices**
```java
// Log state transitions
log.info("Transitioning {} from {} to {}", 
    entityId, sourceState, destState);

// Log step execution
log.info("Executing step: {}", step.getClass().getSimpleName());

// Log failures with context
log.warn("Step failed for {}: {}", entityId, errorMessage);
```

---

## Troubleshooting

### Issue 1: "Transition not possible" Exception

**Cause**: The edge doesn't exist in the graph.

**Solution**:
```
1. Verify the source state is correct
2. Verify the destination state exists
3. Check if edge was added in buildStateTransitionEdges()
4. Ensure states are properly enum values
```

### Issue 2: Step Not Executing

**Cause**: Step bean not found by Spring.

**Solution**:
```java
// Ensure step extends AbstractLeaveStep:
@Component  // ✓ Must have @Component
public class MyStep extends AbstractLeaveStep {
    // ...
}

// Ensure BeanUtil can find it:
AbstractLeaveStep step = (AbstractLeaveStep) BeanUtil.getBean(stepClass);
```

### Issue 3: State Not Updated in Database

**Cause**: `isTransactionStepCompleted` is false.

**Solution**:
```java
// In your step:
// ...do validation...
if (allChecks.passed()) {
    context.setTransactionStepCompleted(true);  // ✓ SET THIS!
}
return context;

// In transition service:
if (context.isTransactionStepCompleted()) {
    // Now update database
    entity.setState(newState);
    repository.save(entity);
}
```

### Issue 4: Circular Dependencies in Step Chain

**Cause**: Step A depends on Step B, Step B depends on Step A.

**Solution**:
```
1. Use interfaces for dependencies
2. Inject via constructor, not static initializers
3. Use @Lazy annotation for optional dependencies
```

### Issue 5: Graph Singleton Not Initialized

**Cause**: Graph instance is null when accessed.

**Solution**:
```java
// Ensure ApplicationRunner initializes graph:
@Bean
public ApplicationRunner initializeStateMachine() {
    return args -> {
        graphBuilder.buildLeaveApplicationGraph();  // ✓ Creates singleton
    };
}

// Then access safely:
LeaveApplicationGraph graph = LeaveApplicationGraph.getInstance();
```

---

## Summary Checklist

Use this checklist when implementing a state machine:

- [ ] **Step 1**: Define all domain states (enum)
- [ ] **Step 2**: Create graph core elements (interfaces + abstract classes)
- [ ] **Step 3**: Create domain-specific vertices and edges
- [ ] **Step 4**: Create state and step interfaces
- [ ] **Step 5**: Implement state enums (step chains)
- [ ] **Step 6**: Create concrete step implementations
- [ ] **Step 7**: Build the graph (define transitions)
- [ ] **Step 8**: Create data fetcher (edge lookup)
- [ ] **Step 9**: Create step executor (chain traversal)
- [ ] **Step 10**: Create transition service (orchestrator)
- [ ] **Step 11**: Create controller/entry points
- [ ] **Step 12**: Initialize graph on startup
- [ ] **Test**: Write unit tests for steps
- [ ] **Test**: Write integration tests for transitions
- [ ] **Document**: Create state transition diagrams
- [ ] **Monitor**: Add comprehensive logging

---

## Additional Resources

### Related Design Patterns
- **State Pattern**: Encapsulates state-specific behavior
- **Strategy Pattern**: Interchangeable algorithms (step implementations)
- **Chain of Responsibility**: Sequential step execution
- **Builder Pattern**: Graph construction
- **Singleton Pattern**: Graph instance management

### Further Reading
- "Design Patterns: Elements of Reusable Object-Oriented Software" by Gang of Four
- Spring Framework Documentation on Components and Transactions
- "Refactoring: Improving the Design of Existing Code" by Martin Fowler

---

**Created**: March 26, 2026
**Version**: 1.0
**Last Updated**: March 26, 2026


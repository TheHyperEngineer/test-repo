# Quick Reference: State Machine Implementation Summary

## 📁 Files Created

✅ **STATE_MACHINE_IMPLEMENTATION_GUIDE.md** (1,416 lines)
- Complete step-by-step instructions
- 12 implementation steps with code examples
- Full Leave Application example
- Best practices and troubleshooting

---

## 🎯 12-Step Quick Reference

### **Phase 1: Foundation**

**Step 1: Define Domain States**
```java
public enum YourDomainState {
    STATE_1,
    STATE_2,
    STATE_3
}
```

**Step 2: Create Graph Core Elements**
- `GraphVertex.java` (interface)
- `GraphEdge.java` (interface)
- `Graph.java` (interface)
- `AbstractGraph.java` (abstract class)
- `AbstractEdge.java` (abstract class)

**Step 3: Create Domain-Specific Graph Classes**
- `YourDomainVertex.java` (wraps state enum)
- `YourDomainEdge.java` (extends AbstractEdge)
- `YourDomainGraph.java` (extends AbstractGraph with singleton)

**Step 4: Create State and Step Interfaces**
- `State.java` - Defines `getStateClass()` and `getNextState()`
- `Step.java` - Defines `executeStep(K k)`
- `StepExecutor.java` - Defines `execute(State state, K k)`

---

### **Phase 2: Implementation**

**Step 5: Create State Implementations (Step Chains)**
```java
public enum YourDomainFlow implements State {
    STEP_1(Step1Class.class, true),    // true = initial state
    STEP_2(Step2Class.class);

    static {
        STEP_1.setNextStep(STEP_2);
        STEP_2.setNextStep(null);      // Terminal
    }
    // ... rest of implementation
}
```

**Step 6: Implement Concrete Steps**
```java
@Component
public class YourStep extends AbstractStep {
    @Override
    public YourContext executeStep(YourContext context) {
        // Business logic here
        context.setTransactionStepCompleted(true);
        return context;
    }
}
```

**Step 7: Build the Graph**
```java
@Service
public class YourGraphBuilder {
    public YourGraph buildGraph() {
        List<YourVertex> nodes = buildStateNodes();
        List<YourEdge> edges = buildTransitionEdges(nodes);
        List<YourEdge> exceptionEdges = buildExceptionEdges(nodes);
        return YourGraph.createInstance(nodes, edges, exceptionEdges);
    }
    
    private List<YourEdge> buildTransitionEdges(...) {
        // Add edges for each valid transition
        // edges.add(createEdge(source, dest, stepChain, fallbacks));
    }
}
```

---

### **Phase 3: Execution**

**Step 8: Create Data Fetcher**
```java
@Service
public class YourTransitionFetcher {
    public YourEdge getTransitionLogic(YourState src, YourState desc) {
        YourGraph graph = YourGraph.getInstance();
        return getEdge(src, desc, graph.getEdges());
    }
}
```

**Step 9: Create Step Executor**
```java
@Component
public class YourStepExecutor implements StepExecutor<YourContext, YourContext> {
    @Override
    public YourContext execute(State fromState, YourContext context) {
        for (State current = fromState; current != null; current = current.getNextState()) {
            YourStep step = (YourStep) BeanUtil.getBean(current.getStateClass());
            context = step.executeStep(context);
        }
        return context;
    }
}
```

**Step 10: Create Transition Service**
```java
@Service
@Transactional(propagation = Propagation.REQUIRES_NEW)
public class YourTransitionServiceImpl implements YourTransitionService {
    
    public YourContext executeTransition(YourState src, YourState dest, YourContext ctx) {
        YourEdge edge = fetcher.getTransitionLogic(src, dest);
        context = executor.execute(edge.getStepExecutorEnum(), context);
        
        if (context.isTransactionStepCompleted()) {
            YourEntity entity = repository.findById(context.getId());
            entity.setState(dest);
            repository.save(entity);
        }
        return context;
    }
}
```

---

### **Phase 4: Integration**

**Step 11: Create Controller/Entry Point**
```java
@RestController
@RequestMapping("/api/resources")
public class YourController {
    
    @PostMapping("/{id}/action")
    public ResponseEntity<?> performAction(@PathVariable Integer id) {
        YourContext context = new YourContext();
        context.setId(id);
        
        transitionService.executeTransition(
            YourState.STATE_1,
            YourState.STATE_2,
            context
        );
        
        return ResponseEntity.ok("Success");
    }
}
```

**Step 12: Initialize on Startup**
```java
@Configuration
public class StateMachineInitializer {
    
    @Bean
    public ApplicationRunner initializeStateMachine(YourGraphBuilder builder) {
        return args -> builder.buildYourGraph();
    }
}
```

---

## 🏗️ Directory Structure Template

```
com/example/yourdomain/
├── constants/
│   ├── database/
│   │   └── YourDomainState.java
│   └── TransactionState/
│       ├── YourFlow1.java (implements State)
│       └── YourFlow2.java (implements State)
├── service/
│   ├── common/
│   │   ├── State.java
│   │   ├── Step.java
│   │   ├── StepExecutor.java
│   │   └── YourContext.java
│   ├── step/
│   │   ├── AbstractYourStep.java
│   │   ├── Step1.java
│   │   ├── Step2.java
│   │   └── YourStepExecutor.java
│   ├── statetransition/
│   │   ├── YourGraph.java
│   │   ├── YourVertex.java
│   │   ├── YourEdge.java
│   │   ├── YourGraphBuilder.java
│   │   ├── YourTransitionFetcher.java
│   │   ├── YourTransitionService.java
│   │   └── YourTransitionServiceImpl.java
│   └── YourTransitionExecutor.java
├── controller/
│   └── YourController.java
├── util/
│   └── graphs/
│       └── coreelements/
│           ├── GraphVertex.java
│           ├── GraphEdge.java
│           ├── Graph.java
│           ├── AbstractGraph.java
│           └── AbstractEdge.java
└── config/
    └── StateMachineInitializer.java
```

---

## ✅ Implementation Checklist

- [ ] Define all states (Step 1)
- [ ] Create graph interfaces (Step 2)
- [ ] Create domain graph classes (Step 3)
- [ ] Create step/state interfaces (Step 4)
- [ ] Implement state enums with step chains (Step 5)
- [ ] Implement concrete step classes (Step 6)
- [ ] Build state transition graph (Step 7)
- [ ] Create data fetcher service (Step 8)
- [ ] Create step executor (Step 9)
- [ ] Create transition orchestrator (Step 10)
- [ ] Create REST controller/entry point (Step 11)
- [ ] Initialize graph on startup (Step 12)
- [ ] Write unit tests for steps
- [ ] Write integration tests for transitions
- [ ] Add logging and monitoring
- [ ] Create state transition diagrams

---

## 🔑 Key Implementation Patterns

### Pattern 1: State Definition
```java
public enum MyStateChain implements State {
    STEP_A(StepA.class, true),
    STEP_B(StepB.class);
    
    static {
        STEP_A.setNextStep(STEP_B);
        STEP_B.setNextStep(null);
    }
    // ... implementation
}
```

### Pattern 2: Transition Execution
```
1. Controller calls transitionService.executeTransition(src, dest, context)
2. Service fetches edge from graph via fetcher
3. Service extracts step chain from edge
4. Service calls executor.execute(stepChain, context)
5. Executor traverses chain, executing each step
6. Service persists state if context.isTransactionStepCompleted() = true
```

### Pattern 3: Step Implementation
```java
public class MyStep extends AbstractStep {
    @Override
    public MyContext executeStep(MyContext ctx) {
        // Validation
        if (!isValid(ctx)) {
            ctx.setTransactionStepCompleted(false);
            ctx.setErrorMessage("reason");
            return ctx;
        }
        
        // Business logic
        doBusinessLogic(ctx);
        
        // Mark success
        ctx.setTransactionStepCompleted(true);
        return ctx;
    }
}
```

---

## ⚠️ Common Pitfalls to Avoid

| ❌ Don't | ✅ Do |
|---------|--------|
| Throw exceptions in steps | Set context flag & message |
| Update DB during step | Update DB after step chain |
| Forget @Component on steps | Annotate all steps |
| Chain steps manually | Use enum step chain pattern |
| Ignore step ordering | Use static block to chain |
| Forget null context checks | Validate context properties |
| Hardcode transitions | Define in graph builder |

---

## 🧪 Testing Examples

### Test a Single Step
```java
@Test
public void testMyStep() {
    MyStep step = new MyStep();
    MyContext ctx = new MyContext();
    ctx.setData("value");
    
    ctx = step.executeStep(ctx);
    
    assertTrue(ctx.isTransactionStepCompleted());
    assertEquals("expected", ctx.getResult());
}
```

### Test a Transition
```java
@Test
public void testStateTransition() {
    // Setup
    LeaveEntity entity = createTestEntity(State.DRAFT);
    
    // Execute
    transitionService.executeTransition(State.DRAFT, State.SUBMITTED, context);
    
    // Verify
    LeaveEntity updated = repository.findById(entity.getId());
    assertEquals(State.SUBMITTED, updated.getState());
}
```

---

## 📚 Learning Resources from Guide

The full guide includes:

1. **Detailed explanations** for each step
2. **Production-ready code** with 25+ Java classes
3. **Complete worked example** (Leave Application)
4. **Architecture diagrams** and flow visualizations
5. **Best practices** for each component
6. **Troubleshooting guide** for common issues
7. **Logging patterns** and async execution
8. **Testing approaches** and strategies

---

## 🚀 Getting Started

1. **Read**: Overview section in the guide
2. **Understand**: Architecture Design section
3. **Follow**: Step 1-4 for foundation
4. **Reference**: Steps 5-12 as you code
5. **Compare**: Your code with Leave Application example
6. **Apply**: Best practices from their section
7. **Debug**: Use troubleshooting section

---

## 📞 Questions to Ask Yourself

Before starting each step:

- ✓ Do I understand the component's responsibility?
- ✓ Do I see where it fits in the architecture?
- ✓ Can I map it to the Order Management example?
- ✓ Do I know what code goes before/after?
- ✓ Can I test this component in isolation?

---

**Document Version**: 1.0  
**Created**: March 26, 2026  
**Total Lines**: 1,416  
**Code Examples**: 25+

For the complete guide with all code examples, see: `STATE_MACHINE_IMPLEMENTATION_GUIDE.md`


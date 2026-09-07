---
trigger: always_on
---

# Product Specification: Task, Goal & Routine Management App

## 1. App Icon Requirement
* A custom **App Icon** must be designed and created as part of this asset package.

---

## 2. Core Modules & Feature Breakdown

### Module A: Task Management
All tasks are displayed and managed inside the **Task Viewing Tab**. Tasks feature a status dropdown to transition between states based on structural constraints.

#### Task Types & Scheduling
* **Without Allocated Time:** The current default behavior. Tasks can be created immediately without a set schedule.
* **With Allocated Time (Same-Day Only):** Tasks scheduled strictly within the current day. Long-term scheduling (across multiple days or months) is not supported.

#### Time Constraints (For Scheduled Tasks Only)
* **Start Time:** Can be set to the current time (`now`) or a future time. Past times are invalid.
* **End Time:** Must always be in the future relative to both `now` and the designated *Start Time*.
* **Duration:** Measured in fixed blocks of **45 minutes**. The user sets the duration by selecting a multiplier (e.g., 1 block = 45 min, 2 blocks = 90 min).
* **Input Interfaces:** The system must support three distinct input options to allocate time:
  1. `Start Time` - `End Time`
  2. `Start Time` - `Duration`
  3. `Duration` only (implicitly assumes `Start Time = now`)

#### State Machines & Transition Rules

[Created] ──> [Pending] ──> [In-Progress] ──> [Completed]

##### Track 1: Unallocated Time Tasks

* **Created:** Applied automatically as soon as the task is generated.
* **Pending:** Requires discussion/refinement (needs further specification).
* **In-Progress:** Requires discussion/refinement (needs further specification).
* **Completed:** **Strict Constraint:** Can *only* be marked complete via explicit user action.

##### Track 2: Allocated Time Tasks
[Created] ──> [Time Allocated] ──> [In-Progress] ──> [Completed]* **Created:** Applied automatically upon generation.
* **Time Allocated:** Automatically transitions to this state if a valid scheduled time is attached during creation, or when a time is subsequently added.
* **In-Progress:** Automatically updates when the current system clock matches the task *Start Time*.
* **Completed:** Automatically triggers a notification once the *End Time* or *Duration* window expires.

#### Notification Schedules
* **Immediate Unallocated Tasks:** Notify the user with a count of active immediate tasks. Prompt the user to review immediate activity **3 times a day** within a **5-hour gap** operating inside a fixed window from **8:00 AM to 11:00 PM**.
* **Active Progress Tracking:** If a task enters the `In-Progress` state, trigger a recurring activity reminder every **45 minutes**.
* **Scheduled Status Updates:** Notify the user automatically when a scheduled task transitions into `In-Progress`.
* **Task Expiration:** Push a notification to the user immediately upon the completion of a scheduled task's duration window.

---

### Module B: Goal Tracking
Goals represent high-level objectives distinct from functional tasks.

#### Daily Goals (Plan for Tomorrow)
* **Creation Window:** Input exclusively at night to define the itinerary for the next day.
* **Capacity Constraints:** Maximum cap of **10 goals** per day. The UI displays **5 primary input fields** initially, with an option to expand up to 10 as needed.
* **Review Systems:** Users can access and read this checklist at any point during the day.
* **Reminders:** 
  * Users can configure a custom recurring reminder to compile this goal list at night.
  * System automatically sends verification alerts to check active goals **2 times a day** at exactly **9:00 AM** and **4:00 PM (16:00)**.

#### Weekly Goals
* **Category Structures:** Segmented into dedicated functional buckets:
  * `Uni`
  * `Work`
  * `Personal`
  * *(System must support dynamic CRUD operations to add new custom categories or delete existing ones).*
* **Nesting Multipliers:** Every weekly goal supports a 3-tier hierarchy: **Goal ──> Sub-Goals ──> Sub-Sub-Goals**. Each sub-tier level is capped at a maximum of **5 child items**.

---

### Module C: Routines
A dedicated behavioral section structured as an iterative checklist.
* **Structure:** Users can build distinct routines with unique descriptive names.
* **Granularity:** Each routine contains multiple granular sub-activities. 
* **Execution:** Sub-activities feature standalone checkboxes to allow independent progress tracking.
* **Alert Infrastructure:** Users can set a custom reminder matrix to review routines at precise times throughout the day, triggering an alert to complete the checklist.

---

## 3. Analysis & Analytics Dashboard (Mathematical Formulation)

The Analytics Tab tracks behavior profiles and compiles them into clean numerical metrics. 

### Daily Metrics

#### 1. Productivity Allocation Time ($T_{\text{prod}}$)
Tracks the sum of total duration spent on completed or in-progress tasks within the current 24-hour cycle.
$$T_{\text{prod}} = \sum_{i \in \text{Tasks}} t_{\text{spent}}(i)$$

#### 2. Goal Hit Rate ($G_{\text{day}}$)
The ratio of accomplished daily goals against total set daily goals.
$$G_{\text{day}} = \frac{G_{\text{completed}}}{G_{\text{total}}} \times 100\% \quad \left(\text{where } G_{\text{total}} \le 10\right)$$

#### 3. Routine Hit Rate ($R_{\text{day}}$)
The percentage of sub-activities successfully checked off across all routines for the day.
$$R_{\text{day}} = \frac{\sum A_{\text{checked}}}{\sum A_{\text{total}}} \times 100\%$$

#### 4. Overall Progress of the Day ($P_{\text{day}}$)
An aggregated weighted performance average across Tasks ($W_1$), Goals ($W_2$), and Routines ($W_3$).
$$P_{\text{day}} = (W_1 \cdot \text{Task Completion Rate}) + (W_2 \cdot G_{\text{day}}) + (W_3 \cdot R_{\text{day}})$$

### Weekly Metrics

#### 1. Weekly Category Progression Matrix ($P_{\text{category}}$)
Evaluates separate progress rates across categories ($c \in \{\text{Uni}, \text{Work}, \text{Personal}, \dots\}$) incorporating sub-tier nested completion values.
$$P_{\text{category}}(c) = \frac{\text{Completed Goals + Sub-goals in } c}{\text{Total Goals + Sub-goals in } c} \times 100\%$$

#### 2. Weekly Aggregation Rates
Compiles historical data over a rolling 7-day period to display trend graphs matching daily math formulas.

---

## 4. System OS Integration (Focus Mode Tracking)
* **OS Environment Logging:** The application must interface with native mobile OS APIs to detect system-level **Focus Modes** (e.g., *Do Not Disturb, Work Mode, Sleep Mode*).
* **Telemetry Data Retrieval:** Whenever a system focus mode is toggled, the application must run a background service listener to record:
  1. The explicit string identifier name of the activated mode.
  2. The precise timestamp logging the duration of time spent inside that mode.
* **Internal Mapping:** This system data must be written directly into the app's local logging history database to be visible in the analysis tab.
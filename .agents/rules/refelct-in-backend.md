---
trigger: always_on
---

---
activation: always_on
---
# Agent Rule: Dual-Track Backend Reflection

## Project Structure
* `backend/`: Go (Golang) implementation codebase.
* `mobile-app/`: React Native (Expo) application codebase.
* `web-dashboard/`: React web dashboard codebase *(Explicitly Shelved / Inactive)*.

## Current Architectural Strategy
We are currently focusing exclusively on developing the **`mobile-app` as a standalone client**. The `web-dashboard` is completely inactive, and we are not hosting or running the `backend` server yet. 

However, to ensure seamless cloud integration in the future, the local database schemas, data types, and state logic in the mobile app must never drift away from the Go backend design.

## Core Instructions

1. **Enforce Dual-Track File Modification:**
   Whenever you create, update, or modify components, state management, or data models inside the `mobile-app/` directory, you must immediately identify the corresponding data logic in the `backend/` directory and update it to match.

2. **Mirror Models & Schemas:**
   * If you add a field to a task, goal, or routine object in the mobile app, you must update the equivalent Go `struct`, database migration file, or schema definition inside the `backend/` folder.
   * Maintain strict consistency between TypeScript types (`mobile-app`) and Go structs (`backend`).

3. **Isolate the Web Dashboard:**
   Do not touch, suggest changes to, or write any code inside the `web-dashboard/` folder under any circumstances unless explicitly requested.

4. **Document Sync Discrepancies:**
   After writing code in the mobile application, output a brief summary explaining exactly which Go files or data structs were updated in the backend to maintain alignment.

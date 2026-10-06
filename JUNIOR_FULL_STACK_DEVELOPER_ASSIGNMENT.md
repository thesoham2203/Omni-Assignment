# **Junior Full Stack Developer Assignment** 

### **Client Request Desk** 

|**Expected effort**|**Submission**|
|---|---|
|6 to 8 hours|Git repository|



This exercise evaluates how you design and implement a small production-style full-stack feature. Complete the core requirements within the suggested time. We value clear decisions, working software, safe data handling, and your ability to explain the solution. 

## **Scenario** 

Build a Client Request Desk for local businesses. Team members receive customer requests, review them, and convert approved requests into work items. 

The application serves multiple business workspaces. Information belonging to one workspace must never be visible or editable from another workspace. 

## **Required Features** 

#### **Workspace Aware API** 

- Seed two workspaces, one user per workspace, and sample customer requests. 

- Provide a simple login or a documented mock authentication mechanism. 

- Implement APIs to list, create, view, and update customer requests. 

- Support the request statuses NEW, QUALIFIED, and CLOSED. 

- Allow a qualified request to be converted into a work item. 

- Prevent users from reading or modifying another workspace's records, including by manually changing an ID. 

- Validate input and return useful HTTP errors. 

#### **Human Confirmed Action** 

Add a Create work item action. Before the API performs the conversion, the interface must show a confirmation containing the customer, requested service, and scheduled date. 

The conversion must: 

- reject requests that are not QUALIFIED; 

- avoid creating duplicates when submitted twice; 

- create an activity entry recording who performed the action and when. 

#### **Frontend** 

Create a responsive interface that includes: 

- a request list with status filtering; 

- request details and an activity timeline; 

- a create and edit form; 

- the confirmed conversion flow; 

- clear loading, empty, validation, and API error states. 

Visual polish matters, but usability and correctness matter more. 

1 

## **Engineering Requirements** 

- Preferred stack: TypeScript, React, Node.js with Express, and PostgreSQL or SQLite. Equivalent choices are acceptable when explained. 

- Include a database migration or schema and a seed command. 

- Test workspace isolation and duplicate conversion prevention. 

- Include at least one test for an important frontend interaction. 

- Include an .env.example file and do not commit secrets. 

- Provide commands for installation, development, tests, and the production build. 

## **Optional Bonus** 

Implement a simulated assistant panel that suggests the next action for a request. It must never create or update data without the user's confirmation. No external AI API is required. 

## **What to Submit** 

Submit a Git repository with a concise README that explains: 

- the architecture and key decisions; 

- assumptions and trade-offs; 

- what you would improve with more time; 

- any AI tools used and how you reviewed their output. 

Your commit history should show understandable development steps. A hosted demo or Docker setup is welcome but not required. 

## **Evaluation Rubric** 

|**Evaluation area**|**Weight**|
|---|---|
|Functional correctness and API design|25%|
|Workspace isolation validation and safe actions|20%|
|Code structure and maintainability|15%|
|Frontend usability and error handling|15%|
|Test quality|15%|
|Setup instructions and engineering communication|10%|



## **Follow Up Discussion** 

During the follow-up discussion, be ready to: 

1.  Demonstrate the complete flow. 

2.  Explain how workspace isolation is enforced. 

3.  Diagnose a deliberately duplicated API request. 

4.  Add one small field or status during the discussion. 

5.  Explain one security or reliability improvement you would make before production. 

2 


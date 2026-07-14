```mermaid
flowchart TD
    %% Define User Roles
    subgraph Users
        E(Employer\nผู้ว่าจ้าง)
        C(Contractor\nผู้รับเหมา)
        A(Data Analyst)
    end

    %% Define UI/UX Sections
    subgraph Frontend [RiskGuard Frontend (Next.js)]
        MP[Marketplace & Portfolio]
        D[Dashboard (CPI/SPI)]
        PT[Project Tracking]
        Chat[Chat & Blueprint]
        Calc[Smart Estimator]
    end

    %% Define Backend Services
    subgraph Backend [FastAPI Server]
        API_M[Matchmaking API]
        API_T[Tracking API]
        API_D[Dashboard/EVM API]
    end

    %% Define Databases
    subgraph Databases
        AppDB[(App DB\nSQLite/PostgreSQL)]
        DW[(Data Warehouse)]
    end

    %% Define Data Pipeline
    subgraph Pipeline [Data Pipeline (Python)]
        Scraper[Web Scraper]
        ETL[ETL Process]
    end

    %% Interactions - Employer Flow
    E -->|1. Find Contractor| MP
    E -->|3. View Progress/Risk| D
    E -->|4. Confirm Stage & Pay| PT

    %% Interactions - Contractor Flow
    C -->|2. Create Profile/Bid| MP
    C -->|3. Upload Evidence| PT
    C -->|Estimate Costs| Calc

    %% Chat interaction
    E <-->|Communicate| Chat
    C <-->|Communicate| Chat

    %% Frontend to Backend
    MP <--> API_M
    PT <--> API_T
    D <--> API_D
    Calc <--> API_D

    %% Backend to Database
    API_M <--> AppDB
    API_T <--> AppDB
    API_D <--> AppDB
    API_D <--> DW

    %% Data Pipeline flow
    Scraper -->|Extract Market Prices| ETL
    ETL -->|Load| DW
    A -->|Monitor/Analyze| DW
```

# Study Sphere Hub

Welcome to Study Sphere Hub, your one-stop solution for accessing academic resources for Visvesvaraya Technological University (VTU). This application is designed to help students easily find and share notes and question papers for various courses, schemes, and branches. It also features an AI-powered chatbot to answer questions about VTU.

## Core Features

-   **User Authentication**: Secure login and signup functionality using Appwrite Authentication for a personalized experience.
-   **Dynamic Resource Finder**: A powerful search interface to filter resources by Scheme, Branch, Year, and Semester.
-   **Resource Uploading**: An intuitive form for users to contribute their own notes and question papers.
    -   **Secure File Storage**: Files are stored securely in Appwrite Storage.
    -   **Overwrite Protection**: If a file for a specific module already exists, the app prompts for confirmation before replacing it, preventing accidental data loss.
-   **Resource Management**: Users can delete resources they have uploaded, giving them full control over their contributions.
-   **Dynamic Resource Display**: Fetches and displays available resources, including user-uploaded content and static links, in a clean, card-based layout.
-   **AI-Powered Chatbot**: A Genkit-based AI assistant powered by Google AI to help with queries related to VTU subjects and syllabus.

## Tech Stack

-   **Framework**: [Next.js](https://nextjs.org/) (App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
-   **AI/Generative**: [Genkit](https://firebase.google.com/docs/genkit) with Google AI
-   **Backend & Authentication**: [Appwrite](https://appwrite.io/)
-   **Database**: [Appwrite Database](https://appwrite.io/docs/databases)
-   **File Storage**: [Appwrite Storage](https://appwrite.io/docs/storage)
-   **Form Management**: [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/) for validation

## Getting Started

Follow these instructions to get the project up and running on your local machine for development and testing purposes.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later)
-   [pnpm](https://pnpm.io/) package manager
-   An [Appwrite](https://appwrite.io/) account (Cloud or Self-hosted)
-   A [Google AI Studio](https://aistudio.google.com/) account for the AI chatbot

### Installation

1.  **Clone the repository:**

    ```bash
    git clone <your-repository-url>
    cd <repository-folder>
    ```

2.  **Install dependencies:**

    ```bash
    pnpm install
    ```

### Environment Setup

This project requires environment variables to connect to Appwrite and Google AI.

1.  **Create a `.env.local` file**: Create a `.env.local` file in the root of the project.

2.  **Add Configuration**: Copy and paste the following configuration into the `.env.local` file. Replace the placeholder values with your actual credentials.

    ```env
    # Appwrite Configuration
    NEXT_PUBLIC_APPWRITE_PROJECT_ID="your-project-id"
    NEXT_PUBLIC_APPWRITE_PROJECT_NAME="Your-Project-Name"
    NEXT_PUBLIC_APPWRITE_ENDPOINT="https://cloud.appwrite.io/v1"

    # Appwrite Storage
    NEXT_PUBLIC_APPWRITE_BUCKET_ID="your-bucket-id"

    # Appwrite Database
    NEXT_PUBLIC_APPWRITE_DATABASE_ID="your-database-id"
    NEXT_PUBLIC_APPWRITE_BRANCHES_COLLECTION_ID="branches"
    NEXT_PUBLIC_APPWRITE_SUBJECTS_COLLECTION_ID="subjects"

    # Appwrite Server API Key (for server-side operations like init-db)
    APPWRITE_API_KEY="your-appwrite-api-key"

    # Google AI API Key (for Genkit chatbot)
    GOOGLE_API_KEY="your-google-ai-api-key"
    ```

### Service Setup

#### 1. Appwrite Setup

1.  **Create an Appwrite Project**:
    -   Go to [Appwrite Cloud](https://cloud.appwrite.io/) or your self-hosted Appwrite console.
    -   Create a new project and note down the **Project ID**.

2.  **Create a Database**:
    -   Navigate to **Databases** in your Appwrite console.
    -   Create a new database (e.g., `ssh-database`) and note down the **Database ID**.

3.  **Create a Storage Bucket**:
    -   Navigate to **Storage** in your Appwrite console.
    -   Create a new bucket (e.g., `ssh-bucket`) and note down the **Bucket ID**.
    -   Configure the bucket permissions as needed for your use case.

4.  **Generate an API Key**:
    -   Go to **Settings** → **API Keys** in your Appwrite console.
    -   Create a new API key with the following scopes:
        -   `databases.read`, `databases.write`
        -   `collections.read`, `collections.write`
        -   `attributes.read`, `attributes.write`
        -   `documents.read`, `documents.write`
        -   `files.read`, `files.write`
    -   Copy the API key and add it to your `.env.local` file as `APPWRITE_API_KEY`.

5.  **Add your Appwrite credentials** to the `.env.local` file.

#### 2. Google AI Setup

1.  **Get a Google AI API Key**:
    -   Go to [Google AI Studio](https://aistudio.google.com/).
    -   Create a new API key.
    -   Add the API key to your `.env.local` file as `GOOGLE_API_KEY`.

### Initialize the Database

Before running the application for the first time, you need to initialize the database collections.

1.  **Start the development server**:

    ```bash
    pnpm dev
    ```

2.  **Initialize the database** by calling the init-db API endpoint. Open a new terminal and run:

    ```bash
    curl -X POST http://localhost:9003/api/init-db
    ```

    This will create the required collections (`branches` and `subjects`) with their attributes in your Appwrite database.

    **Expected Response:**

    ```json
    {
      "message": "Database initialization completed",
      "results": {
        "branches": { "created": true, "existed": false, "error": null },
        "subjects": { "created": true, "existed": false, "error": null }
      }
    }
    ```

    > **Note:** If the collections already exist, the response will show `"existed": true` instead.

### Running the Application

#### Development Server

```bash
pnpm dev
```

Open [http://localhost:9003](http://localhost:9003) in your browser.

#### Genkit AI Development Server (Optional)

To run the Genkit AI development server separately for testing AI flows:

```bash
pnpm genkit:dev
```

Or with watch mode:

```bash
pnpm genkit:watch
```

#### Production Build

```bash
pnpm build
pnpm start
```

## Available Scripts

| Script            | Description                                      |
| ----------------- | ------------------------------------------------ |
| `pnpm dev`        | Start the Next.js development server             |
| `pnpm build`      | Build the application for production             |
| `pnpm start`      | Start the production server                      |
| `pnpm lint`       | Run ESLint to check for code issues              |
| `pnpm typecheck`  | Run TypeScript type checking                     |
| `pnpm genkit:dev` | Start Genkit AI development server               |
| `pnpm genkit:watch` | Start Genkit AI dev server with hot reload     |

## API Endpoints

| Endpoint          | Method | Description                              |
| ----------------- | ------ | ---------------------------------------- |
| `/api/init-db`    | POST   | Initialize database collections          |
| `/api/init-db`    | GET    | Get information about database schema    |
| `/api/resources`  | GET    | Fetch available resources                |

## Project Structure

```
src/
├── ai/                 # Genkit AI configuration and flows
├── app/                # Next.js App Router pages and API routes
├── components/         # React components (app and ui)
├── context/            # React context providers
├── hooks/              # Custom React hooks
└── lib/                # Utility functions and configurations
```

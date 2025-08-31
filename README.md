# VTU Assistant

Welcome to VTU Assistant, your one-stop solution for accessing academic resources for Visvesvaraya Technological University (VTU). This application is designed to help students easily find and share notes and question papers for various courses, schemes, and branches. It also features an AI-powered chatbot to answer questions about VTU.

## Core Features

-   **User Authentication**: Secure login and signup functionality for personalized access.
-   **Dynamic Resource Finder**: A powerful search interface to filter resources by Scheme, Branch, Year, and Semester.
-   **Resource Uploading**: An intuitive form for users to contribute their own notes and question papers, which are stored securely in Firebase Storage.
-   **Dynamic Resource Display**: Fetches and displays available resources, including user-uploaded content and static links, in a clean, card-based layout.
-   **AI-Powered Chatbot**: A Genkit-based AI assistant to help with queries related to VTU subjects and syllabus.
-   **AI-Powered Summarization**: Uploaded PDF documents are automatically summarized using an AI flow to provide quick insights.

## Tech Stack

-   **Framework**: [Next.js](https://nextjs.org/) (App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
-   **AI/Generative**: [Genkit](https://firebase.google.com/docs/genkit)
-   **Backend & Auth**: [Firebase](https://firebase.google.com/) (Authentication, Cloud Storage)
-   **Form Management**: [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/) for validation

## Getting Started

Follow these instructions to get the project up and running on your local machine for development and testing purposes.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later)
-   `npm` or `yarn` package manager
-   [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (for the `gsutil` command)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd <repository-folder>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Firebase Setup

This project requires a Firebase project to handle authentication and file storage.

1.  **Create a Firebase Project**: If you haven't already, go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.

2.  **Create a `.env` file**: Create a `.env` file in the root of the project and add your Firebase project's web app configuration keys. This file is used to securely load your Firebase credentials.

    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY="AIza..."
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
    NEXT_PUBLIC_FIREBASE_APP_ID="1:..."
    ```

3.  **Enable Firebase Services**:
    -   In the Firebase Console, go to **Authentication** and enable the **Email/Password** sign-in method.
    -   Go to **Storage** and activate it to create your default storage bucket.

4.  **Set Storage CORS Permissions**: To allow file uploads from your local development environment, you must apply a CORS policy to your storage bucket.
    -   Make sure the `storage-cors.json` file exists in your project root with the correct origins.
    -   Run the following command, replacing `your-project-id.appspot.com` with your actual bucket name:
        ```bash
        gsutil cors set storage-cors.json gs://your-project-id.appspot.com
        ```

5.  **Set Storage Security Rules**: For development, you can use open rules to allow uploads. Go to **Storage -> Rules** in the Firebase Console and publish the following:
    ```
    rules_version = '2';
    service firebase.storage {
      match /b/{bucket}/o {
        match /{allPaths=**} {
          allow read, write: if true; // Insecure, for testing only
        }
      }
    }
    ```
    **Note**: For production, you should restrict these rules (e.g., `if request.auth != null;`).

### Running the Development Server

Once the setup is complete, you can run the application:

```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) (or your configured port) with your browser to see the result.

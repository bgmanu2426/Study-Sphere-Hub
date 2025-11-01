
# VTU Assistant

Welcome to VTU Assistant, your one-stop solution for accessing academic resources for Visvesvaraya Technological University (VTU). This application is designed to help students easily find and share notes and question papers for various courses, schemes, and branches. It also features an AI-powered chatbot to answer questions about VTU.

## Core Features

-   **User Authentication**: Secure login and signup functionality for personalized access.
-   **Dynamic Resource Finder**: A powerful search interface to filter resources by Scheme, Branch, Year, and Semester.
-   **Resource Uploading**: An intuitive form for users to contribute their own notes and question papers, which are stored securely in AWS S3.
-   **Dynamic Resource Display**: Fetches and displays available resources, including user-uploaded content and static links, in a clean, card-based layout.
-   **AI-Powered Chatbot**: A Genkit-based AI assistant to help with queries related to VTU subjects and syllabus.
-   **AI-Powered Summarization**: Uploaded PDF documents are automatically summarized using an AI flow to provide quick insights.

## Tech Stack

-   **Framework**: [Next.js](https://nextjs.org/) (App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
-   **AI/Generative**: [Genkit](https://firebase.google.com/docs/genkit)
-   **Authentication**: [Firebase Authentication](https://firebase.google.com/docs/auth)
-   **File Storage**: [AWS S3](https://aws.amazon.com/s3/)
-   **Form Management**: [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/) for validation

## Getting Started

Follow these instructions to get the project up and running on your local machine for development and testing purposes.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later)
-   `npm` or `yarn` package manager
-   An AWS Account

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

### Environment Setup

This project requires environment variables to connect to Firebase and AWS S3.

1.  **Create a `.env` file**: Create a `.env` file in the root of the project.
2.  **Add Configuration**: Copy and paste the following configuration into the `.env` file. You will need to replace the placeholder values with your actual credentials.

    ```env
    # Firebase Configuration (for user authentication)
    NEXT_PUBLIC_FIREBASE_API_KEY="AIza..."
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
    NEXT_PUBLIC_FIREBASE_APP_ID="1:..."

    # AWS S3 Configuration (for file storage)
    AWS_ACCESS_KEY_ID="YOUR_AWS_ACCESS_KEY"
    AWS_SECRET_ACCESS_KEY="YOUR_AWS_SECRET_KEY"
    AWS_REGION="your-s3-bucket-region" # e.g., us-east-1
    S3_BUCKET_NAME="your-s3-bucket-name"
    ```

### Service Setup

1.  **Firebase**:
    -   Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
    -   In the Firebase Console, go to **Authentication** and enable the **Email/Password** sign-in method.
    -   Find your web app configuration keys in the Project Settings and add them to your `.env` file.

2.  **AWS S3**:
    -   Go to the [AWS Management Console](https://aws.amazon.com/console/) and sign in.
    -   Navigate to the **S3** service.
    -   Create a new S3 bucket. Choose a unique name and select the region you want to use.
    -   Once the bucket is created, navigate to the **Permissions** tab.
    -   Under **Block public access (bucket settings)**, click **Edit** and uncheck "Block all public access". Save the changes and confirm. This is necessary for the app to make uploaded files publicly readable.
    -   Create an IAM user with programmatic access to get an Access Key ID and Secret Access Key. Grant this user `AmazonS3FullAccess` permissions (for simplicity) or a more restrictive policy that allows `s3:PutObject`, `s3:PutObjectAcl`, and `s3:ListBucket` actions on your bucket.
    -   Add your AWS credentials, region, and bucket name to the `.env` file.

### Running the Development Server

Once the setup is complete, you can run the application:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the port shown in your terminal, as the default may be different).

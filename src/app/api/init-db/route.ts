import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, Permission, Role } from 'node-appwrite';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const BRANCHES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_BRANCHES_COLLECTION_ID!;
const SUBJECTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_SUBJECTS_COLLECTION_ID!;

async function initializeDatabase() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!); // Server-side API key

  const databases = new Databases(client);

  const results = {
    branches: { created: false, existed: false, error: null as string | null },
    subjects: { created: false, existed: false, error: null as string | null },
  };

  // Create branches collection
  try {
    await databases.getCollection(DATABASE_ID, BRANCHES_COLLECTION_ID);
    results.branches.existed = true;
  } catch (error: any) {
    if (error?.code === 404) {
      try {
        // Create the collection
        await databases.createCollection(
          DATABASE_ID,
          BRANCHES_COLLECTION_ID,
          'Branches',
          [
            Permission.read(Role.any()),
            Permission.create(Role.users()),
            Permission.update(Role.users()),
            Permission.delete(Role.users()),
          ]
        );

        // Create attributes
        await databases.createStringAttribute(
          DATABASE_ID,
          BRANCHES_COLLECTION_ID,
          'value',
          50,
          true
        );

        await databases.createStringAttribute(
          DATABASE_ID,
          BRANCHES_COLLECTION_ID,
          'label',
          100,
          true
        );

        await databases.createStringAttribute(
          DATABASE_ID,
          BRANCHES_COLLECTION_ID,
          'scheme',
          10,
          true
        );

        results.branches.created = true;
      } catch (createError: any) {
        results.branches.error = createError?.message || 'Failed to create branches collection';
      }
    } else {
      results.branches.error = error?.message || 'Unknown error';
    }
  }

  // Create subjects collection
  try {
    await databases.getCollection(DATABASE_ID, SUBJECTS_COLLECTION_ID);
    results.subjects.existed = true;
  } catch (error: any) {
    if (error?.code === 404) {
      try {
        // Create the collection
        await databases.createCollection(
          DATABASE_ID,
          SUBJECTS_COLLECTION_ID,
          'Subjects',
          [
            Permission.read(Role.any()),
            Permission.create(Role.users()),
            Permission.update(Role.users()),
            Permission.delete(Role.users()),
          ]
        );

        // Create attributes
        await databases.createStringAttribute(
          DATABASE_ID,
          SUBJECTS_COLLECTION_ID,
          'subjectId',
          50,
          true
        );

        await databases.createStringAttribute(
          DATABASE_ID,
          SUBJECTS_COLLECTION_ID,
          'name',
          200,
          true
        );

        await databases.createStringAttribute(
          DATABASE_ID,
          SUBJECTS_COLLECTION_ID,
          'scheme',
          10,
          true
        );

        await databases.createStringAttribute(
          DATABASE_ID,
          SUBJECTS_COLLECTION_ID,
          'branch',
          50,
          true
        );

        await databases.createStringAttribute(
          DATABASE_ID,
          SUBJECTS_COLLECTION_ID,
          'semester',
          10,
          true
        );

        results.subjects.created = true;
      } catch (createError: any) {
        results.subjects.error = createError?.message || 'Failed to create subjects collection';
      }
    } else {
      results.subjects.error = error?.message || 'Unknown error';
    }
  }

  return results;
}

export async function POST(request: NextRequest) {
  // Check for API key in environment
  if (!process.env.APPWRITE_API_KEY) {
    return NextResponse.json(
      { error: 'APPWRITE_API_KEY environment variable is not set' },
      { status: 500 }
    );
  }

  try {
    const results = await initializeDatabase();
    return NextResponse.json({
      message: 'Database initialization completed',
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to initialize database' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST request to initialize database collections',
    collections: {
      branches: {
        id: BRANCHES_COLLECTION_ID,
        attributes: ['value (string)', 'label (string)', 'scheme (string)'],
      },
      subjects: {
        id: SUBJECTS_COLLECTION_ID,
        attributes: ['subjectId (string)', 'name (string)', 'scheme (string)', 'branch (string)', 'semester (string)'],
      },
    },
  });
}

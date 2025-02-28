const axios = require('axios');

// Get GitHub repository information from the environment variables
const [REPO_OWNER, REPO_NAME] = process.env.GITHUB_REPOSITORY.split('/');

// Set up other constants
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // GitHub token for authentication
const TARGET_BRANCH = process.env.TARGET_BRANCH || 'main'; // Target branch to commit to
const COMMITTER_NAME = 'GitHub Actions';
const COMMITTER_EMAIL = 'actions@github.com';
const FILE_PATH = 'newfile.txt'; // Path for the new file to be created
const FILE_CONTENT = 'This is a new file created via Node.js script';

async function createCommit() {
  try {
    // Step 1: Get the latest commit SHA from the target branch
    const shaResponse = await axios.get(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/${TARGET_BRANCH}`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    const latestCommitSha = shaResponse.data.object.sha;
    console.log(`Latest commit SHA for branch ${TARGET_BRANCH}: ${latestCommitSha}`);

    // Step 2: Create a new blob (file) in GitHub storage
    const contentBase64 = Buffer.from(FILE_CONTENT).toString('base64');
    const blobResponse = await axios.post(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/blobs`,
      {
        content: contentBase64,
        encoding: 'base64',
      },
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    const blobSha = blobResponse.data.sha;
    console.log(`Created new blob (file) with SHA: ${blobSha}`);

    // Step 3: Create a new tree (commit object) that includes the new file
    const treeResponse = await axios.post(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees`,
      {
        base_tree: latestCommitSha,
        tree: [
          {
            path: FILE_PATH,
            mode: '100644',
            type: 'blob',
            sha: blobSha,
          },
        ],
      },
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    const treeSha = treeResponse.data.sha;
    console.log(`Created new tree with SHA: ${treeSha}`);

    // Step 4: Create a new commit
    const commitResponse = await axios.post(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/commits`,
      {
        message: 'Add newfile.txt via Node.js script',
        tree: treeSha,
        parents: [latestCommitSha],
        author: {
          name: COMMITTER_NAME,
          email: COMMITTER_EMAIL,
        },
        committer: {
          name: COMMITTER_NAME,
          email: COMMITTER_EMAIL,
        },
      },
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    const commitSha = commitResponse.data.sha;
    console.log(`Created new commit with SHA: ${commitSha}`);

    // Step 5: Update the branch reference to point to the new commit
    await axios.patch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/${TARGET_BRANCH}`,
      {
        sha: commitSha,
      },
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    console.log(`Successfully committed new file to branch ${TARGET_BRANCH}`);
  } catch (error) {
    console.error('Error creating commit:', error.response ? error.response.data : error.message);
  }
}

// Call the createCommit function
createCommit();

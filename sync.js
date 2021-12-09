const { Octokit, App } = require("octokit");

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const limit = 1;
const org = process.argv[2];
const repo = process.argv[3];
const projectNumber = process.argv[4];
const label = process.argv[5];

async function run() {
  if (!org) {
    console.log("Missing org");
    return;
  }

  if (!repo) {
    console.log("Missing repo");
    return;
  }

  if (!label) {
    console.log("Missing label");
    return;
  }

  const projectReponse = await octokit.graphql(`
      query{
        organization(login: "${org}"){
          projectNext(number: ${projectNumber}) {
            id
            title
          }
        }
      }`);

  const projectTitle = projectReponse?.organization.projectNext.title;
  const projectNodeId = projectReponse?.organization.projectNext.id;

  if (!projectNodeId) {
    console.error("Project not found");
    return;
  }

  const issues = await octokit.request(`/repos/${org}/${repo}/issues`, {
    labels: label,
    per_page: limit,
    direction: "asc",
  });

  console.log(`Adding ${issues.data.length} issues to ${projectTitle}`);
  console.log("");

  for (const issue of issues.data) {
    console.log(`[${issue.number}] ${issue.title}`);
    const labels = issue.labels.map((label) => `"${label.name}"`);
    console.log(` - Labels: ${labels.join(", ")}`);

    const response = await octokit.graphql(`
      mutation {
        addProjectNextItem(input: {projectId: "${projectNodeId}" contentId: "${issue.node_id}"}) {
          projectNextItem {
            id
          }
        }
      }`);

    const addedToProject = response?.addProjectNextItem?.projectNextItem?.id;
    console.log(
      ` - Added to project (${projectTitle}) with Node ID:`,
      addedToProject || "FAILED"
    );

    console.log(` - ${issue.html_url}`);
    console.log("");
  }
}

run();

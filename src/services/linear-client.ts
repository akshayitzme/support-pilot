import { LINEAR_POLL_CONF } from "../config/linear-poll";
import type { FetchRecentIssuesOptions, LinearIssue } from "../types/linear";

class LinearClient {
  private async linearAPIRequest(body: object) {
    return fetch(LINEAR_POLL_CONF.API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: LINEAR_POLL_CONF.API_KEY,
      },
      body: JSON.stringify(body),
    });
  }

  async postLinearComment(issueId: string, body: string, retries = 3): Promise<boolean> {
    const mutation = `
      mutation CommentCreate($issueId: String!, $body: String!) {
        commentCreate(input: {
          issueId: $issueId,
          body: $body
        }) {
          success
          comment { id }
        }
      }
    `;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await this.linearAPIRequest({
          query: mutation,
          variables: { issueId, body },
        });

        if (!response.ok) {
          throw new Error(`Linear API error: ${response.status}`);
        }

        const result = await response.json();

        if (result.errors) {
          throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
        }

        console.info(`Posted comment to ${issueId}`, {
          commentId: result.data?.commentCreate?.comment?.id,
        });
        return result.data?.commentCreate?.success ?? false;
      } catch (error) {
        console.warn(`Attempt ${attempt}/${retries} failed for postLinearComment`, {
          error: error instanceof Error ? error.message : String(error),
          issueId,
        });

        if (attempt === retries) {
          console.error(`Failed to post comment after ${retries} attempts`, {
            issueId,
          });
          return false;
        }

        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000));
      }
    }
    return false;
  }

  async fetchRecentIssues(options: FetchRecentIssuesOptions): Promise<LinearIssue[]> {
    const query = `
			query FetchRecentIssues($filter: IssueFilter, $limit: Int) {
			issues(first: $limit, filter: $filter) {
				nodes {
				id
				identifier
				title
				description
				createdAt
				state {
					name
					type
				}
				}
			}
			}
			`;

    try {
      const response = await this.linearAPIRequest({
        query,
        variables: {
          limit: 20,
          // filter: {
          // 	createdAt: {
          // 		gte: options.createdAfter.toISOString(),
          // 	},
          // },
        },
      });

      if (!response.ok) {
        throw new Error(`Linear API error: ${response.status}`);
      }

      const result = await response.json();

      if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      return result.data?.issues?.nodes || [];
    } catch (error) {
      console.error("Failed to fetch issues from Linear", { error });
      return [];
    }
  }
}

export const linearClient = new LinearClient();

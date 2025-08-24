import type { GitHubRepository, GitHubIssue, ClaudeRequest, ImplementationDetails, ExplanationDetails, ReviewDetails } from '../types/index.js';
import { dispatchWorkflow } from './githubAppAuthService.js';

class ClaudeService {
  /**
   * Trigger GitHub Actions workflow dispatch
   */
  async triggerWorkflowDispatch(
    github: any,
    repository: GitHubRepository,
    workflowId: string,
    inputs: Record<string, any> = {}
  ): Promise<void> {
    try {
      await github.rest.actions.createWorkflowDispatch({
        owner: repository.owner.login,
        repo: repository.name,
        workflow_id: workflowId,
        ref: 'main', // or specify branch
        inputs
      });
      console.log(`✅ Triggered workflow: ${workflowId}`);
    } catch (error) {
      console.error(`❌ Failed to trigger workflow ${workflowId}:`, error);
    }
  }

  /**
   * Trigger Claude workflow via workflow_dispatch (no @claude mention needed)
   */
  async triggerClaudeWorkflow(
    github: any,
    repository: GitHubRepository,
    issue: GitHubIssue
  ): Promise<void> {
    try {
      // Use GitHub App installation token to trigger workflow_dispatch
      await dispatchWorkflow({
        owner: repository.owner.login,
        repo: repository.name,
        repositoryId: repository.id,
        workflowId: 'claude.yml',
        ref: 'main',
        inputs: {
          action_type: 'create-pr',
          context: issue.body || ''
        },
      });

      console.log(`✅ Triggered Claude workflow for issue #${issue.number}`);
    } catch (error) {
      console.error('❌ Failed to trigger Claude workflow:', error);
    }
  }

  /**
   * Create issue that triggers Claude Action via assignment (no @claude mention needed)
   */
  async createClaudeTriggeredIssue(
    github: any,
    repository: GitHubRepository,
    title: string,
    body: string,
    autoTrigger: boolean = true
  ): Promise<void> {
    try {
      const issueData = {
        owner: repository.owner.login,
        repo: repository.name,
        title,
        body,
        assignees: autoTrigger ? ['github-actions[bot]'] : []
      };

      const response = await github.rest.issues.create(issueData);
      console.log(`✅ Created Claude-triggered issue #${response.data.number}`);
    } catch (error) {
      console.error('❌ Failed to create Claude-triggered issue:', error);
    }
  }

  /**
   * Create PR that triggers automatic Claude code review
   */
  async createClaudeReviewedPR(
    github: any,
    repository: GitHubRepository,
    title: string,
    head: string,
    base: string = 'main',
    body: string = ''
  ): Promise<void> {
    try {
      const prData = {
        owner: repository.owner.login,
        repo: repository.name,
        title,
        head,
        base,
        body: `${body}\n\n🤖 This PR will be automatically reviewed by Claude Code Review Action.`
      };

      const response = await github.rest.pulls.create(prData);
      console.log(`✅ Created PR #${response.data.number} - will trigger Claude review`);

      // Optionally add a comment to explicitly request Claude review
      await github.rest.issues.createComment({
        owner: repository.owner.login,
        repo: repository.name,
        issue_number: response.data.number,
        body: '@claude please provide a thorough code review focusing on best practices and potential issues.'
      });

    } catch (error) {
      console.error('❌ Failed to create Claude-reviewed PR:', error);
    }
  }

  async handleClaudeMention(
    github: any,
    repository: GitHubRepository,
    issue: GitHubIssue
  ): Promise<void> {
    try {
      console.log(`🤖 Processing Claude request in issue: ${issue.title}`);

      // Trigger Claude workflow by assigning issue to github-actions[bot]
      await github.rest.issues.update({
        owner: repository.owner.login,
        repo: repository.name,
        issue_number: issue.number,
        assignees: ['github-actions[bot]']
      });

      console.log('✅ Assigned issue to github-actions[bot] to trigger Claude workflow');

      const claudeResponse = await this.generateClaudeResponse(issue);

      // Post comment with Claude's response
      await github.rest.issues.createComment({
        owner: repository.owner.login,
        repo: repository.name,
        issue_number: issue.number,
        body: claudeResponse
      });

      console.log('✅ Posted Claude response to issue');
    } catch (error) {
      console.error('❌ Error handling Claude request:', error);

      // Post error comment
      try {
        await github.rest.issues.createComment({
          owner: repository.owner.login,
          repo: repository.name,
          issue_number: issue.number,
          body: `❌ I encountered an error processing your request. Please try again or check the logs.
        
*Error: ${error instanceof Error ? error.message : 'Unknown error'}*`
        });
      } catch (commentError) {
        console.error('❌ Failed to post error comment:', commentError);
      }
    }
  }

  private async generateClaudeResponse(issue: GitHubIssue): Promise<string> {
    const { title, body } = issue;

    // Parse the issue content to understand what's being requested
    const request = this.parseClaudeRequest(body || '');

    switch (request.type) {
      case 'implementation':
        return this.generateImplementationResponse(request, title);
      case 'explanation':
        return this.generateExplanationResponse(request, title);
      case 'review':
        return this.generateReviewResponse(request, title);
      case 'help':
        return this.generateHelpResponse(request, title);
      default:
        return this.generateDefaultResponse(title, body);
    }
  }

  private parseClaudeRequest(text: string): ClaudeRequest {
    const lowerText = text.toLowerCase();

    // Implementation requests
    if (lowerText.includes('implement') || lowerText.includes('create') || lowerText.includes('build')) {
      return {
        type: 'implementation',
        details: this.extractImplementationDetails(text)
      };
    }

    // Explanation requests
    if (lowerText.includes('explain') || lowerText.includes('how does') || lowerText.includes('what is')) {
      return {
        type: 'explanation',
        details: this.extractExplanationDetails(text)
      };
    }

    // Review requests
    if (lowerText.includes('review') || lowerText.includes('check') || lowerText.includes('feedback')) {
      return {
        type: 'review',
        details: this.extractReviewDetails(text)
      };
    }

    // Help requests
    if (lowerText.includes('help') || lowerText.includes('assist') || lowerText.includes('support')) {
      return {
        type: 'help',
        details: text
      };
    }

    return {
      type: 'general',
      details: text
    };
  }

  private extractImplementationDetails(text: string): ImplementationDetails {
    // Extract key information about what to implement
    return {
      features: this.extractFeatures(text),
      technology: this.extractTechnology(text),
      requirements: this.extractRequirements(text)
    };
  }

  private extractFeatures(text: string): string[] {
    const features: string[] = [];
    const featurePatterns = [
      /feature[s]?:([^\n]+)/gi,
      /implement[s]?:([^\n]+)/gi,
      /need[s]?:([^\n]+)/gi,
      /require[s]?:([^\n]+)/gi
    ];

    for (const pattern of featurePatterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        features.push(match[1].trim());
      }
    }

    return features;
  }

  private extractTechnology(text: string): string | null {
    const techMentions: Record<string, RegExp> = {
      'React': /react/i,
      'Vue': /vue/i,
      'Angular': /angular/i,
      'Node.js': /node\.?js/i,
      'Python': /python/i,
      'Django': /django/i,
      'Flask': /flask/i,
      'Express': /express/i,
      'Next.js': /next\.?js/i,
      'TypeScript': /typescript|ts/i,
      'JavaScript': /javascript|js/i
    };

    for (const [tech, pattern] of Object.entries(techMentions)) {
      if (pattern.test(text)) {
        return tech;
      }
    }

    return null;
  }

  private extractRequirements(text: string): string[] {
    const requirements: string[] = [];
    const reqPatterns = [
      /must[s]?:([^\n]+)/gi,
      /should[s]?:([^\n]+)/gi,
      /requirement[s]?:([^\n]+)/gi
    ];

    for (const pattern of reqPatterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        requirements.push(match[1].trim());
      }
    }

    return requirements;
  }

  private extractExplanationDetails(text: string): ExplanationDetails {
    return {
      topic: this.extractTopic(text),
      level: this.extractComplexityLevel(text)
    };
  }

  private extractTopic(text: string): string {
    const topicPatterns = [
      /explain ([^\n\?]+)/i,
      /how does ([^\n\?]+)/i,
      /what is ([^\n\?]+)/i
    ];

    for (const pattern of topicPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return 'the topic mentioned';
  }

  private extractComplexityLevel(text: string): ExplanationDetails['level'] {
    if (text.includes('simple') || text.includes('basic') || text.includes('beginner')) {
      return 'basic';
    }
    if (text.includes('detailed') || text.includes('advanced') || text.includes('deep')) {
      return 'advanced';
    }
    return 'intermediate';
  }

  private extractReviewDetails(text: string): ReviewDetails {
    return {
      codeRef: this.extractCodeReference(text),
      focusAreas: this.extractFocusAreas(text)
    };
  }

  private extractCodeReference(text: string): string | null {
    const patterns = [
      /review ([^\n]+\.\w+)/i,
      /check ([^\n]+\.\w+)/i,
      /look at ([^\n]+\.\w+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  private extractFocusAreas(text: string): string[] {
    const areas: string[] = [];
    const focusPatterns = [
      'performance', 'security', 'best practices', 'optimization',
      'readability', 'maintainability', 'testing', 'documentation'
    ];

    const lowerText = text.toLowerCase();
    for (const area of focusPatterns) {
      if (lowerText.includes(area)) {
        areas.push(area);
      }
    }

    return areas.length > 0 ? areas : ['general'];
  }

  private generateImplementationResponse(request: ClaudeRequest, title: string): string {
    const details = request.details as ImplementationDetails;

    return `🤖 **Claude Implementation Assistant**

I'd be happy to help implement this! Based on your request, here's my analysis:

## Implementation Plan

**Project:** ${title}

### Suggested Approach
${details.technology ? `**Technology Stack:** ${details.technology}` : '**Technology:** Will suggest based on requirements'}

### Key Features to Implement
${details.features.length > 0 ? details.features.map(f => `- ${f}`).join('\n') : '- Core functionality as described'}

### Requirements Analysis
${details.requirements.length > 0 ? details.requirements.map(r => `- ${r}`).join('\n') : '- Standard best practices will be applied'}

## Next Steps
1. **Setup**: I'll create the project structure
2. **Core Implementation**: Build the main functionality
3. **Testing**: Add appropriate tests
4. **Documentation**: Create usage examples

## Getting Started
To proceed with implementation:
1. Make sure the repository has the necessary files (check CLAUDE.md if available)
2. I'll start with the core functionality
3. We can iterate and refine based on your feedback

Would you like me to begin with any specific part of the implementation?

---
*🤖 Automated response from Claude Todo GitHub Service*`;
  }

  private generateExplanationResponse(request: ClaudeRequest, title: string): string {
    const details = request.details as ExplanationDetails;

    return `🤖 **Claude Explanation Assistant**

I'll help explain ${details.topic}!

## Topic: ${title}

### Explanation Level: ${details.level}

Based on your question, I can provide insights on:
- Core concepts and principles
- Implementation details
- Best practices
- Common patterns and approaches

## How I Can Help
- Break down complex topics into understandable parts
- Provide code examples and practical demonstrations
- Explain the reasoning behind different approaches
- Suggest resources for further learning

Please feel free to ask follow-up questions or request specific aspects you'd like me to focus on!

---
*🤖 Automated response from Claude Todo GitHub Service*`;
  }

  private generateReviewResponse(request: ClaudeRequest, title: string): string {
    const details = request.details as ReviewDetails;

    return `🤖 **Claude Code Review Assistant**

I'm ready to review your code!

## Review Request: ${title}

### Focus Areas
${details.focusAreas.map(area => `- ${area.charAt(0).toUpperCase() + area.slice(1)}`).join('\n')}

${details.codeRef ? `### File to Review
\`${details.codeRef}\`` : '### Files to Review\nPlease specify which files you\'d like me to review.'}

## Review Process
I'll examine:
1. **Code Quality** - Structure, readability, maintainability
2. **Best Practices** - Language-specific conventions
3. **Performance** - Optimization opportunities
4. **Security** - Potential vulnerabilities
5. **Testing** - Test coverage and quality

## Next Steps
- Share the code files or specify which files to review
- I'll provide detailed feedback with suggestions
- We can discuss improvements and alternatives

Ready to help improve your code quality!

---
*🤖 Automated response from Claude Todo GitHub Service*`;
  }

  private generateHelpResponse(_request: ClaudeRequest, title: string): string {
    return `🤖 **Claude Help Assistant**

I'm here to help with: ${title}

## Available Services
- **Implementation**: Create new features and functionality
- **Code Review**: Analyze and improve existing code
- **Explanation**: Break down complex concepts
- **Debugging**: Help identify and fix issues
- **Architecture**: Design system structure
- **Documentation**: Create clear documentation

## How to Work with Me
- **Be specific**: The more details you provide, the better I can help
- **Use examples**: Show me what you're working with
- **Ask follow-ups**: Don't hesitate to ask for clarification

## Common Commands
- \`@claude implement [feature]\` - Request implementation
- \`@claude explain [concept]\` - Get explanations
- \`@claude review [file]\` - Request code review
- \`@claude help with [problem]\` - General assistance

What would you like help with today?

---
*🤖 Automated response from Claude Todo GitHub Service*`;
  }

  private generateDefaultResponse(title: string, _body: string | null): string {
    return `🤖 **Claude Assistant**

Hello! I noticed you mentioned me in "${title}".

## How I Can Help
I'm the Claude Todo GitHub Service assistant! I can help you with:

- **Implementation** - Building features and functionality
- **Code Review** - Analyzing and improving code quality  
- **Explanation** - Breaking down complex concepts
- **Project Setup** - Creating project structures
- **Documentation** - Writing clear documentation

## Getting Started
Try mentioning me with specific requests like:
- "@claude implement user authentication"
- "@claude review this code for performance"
- "@claude explain how this algorithm works"

Feel free to be specific about what you need help with, and I'll do my best to assist!

---
*🤖 Automated response from Claude Todo GitHub Service*`;
  }
}

export const claudeService = new ClaudeService();
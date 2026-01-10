/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
  AI: Ai;
  DURABLE_OBJECTS: DurableObjectNamespace;
}

export class DURABLE_OBJECTS {
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  };
  
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/store" && request.method === "POST") {
      const data = await request.json();
      await this.state.storage.put("session", data);
      return new Response(JSON.stringify({ success: true }));
    }
    
    // Get data
    if (url.pathname === "/get") {
      const data = await this.state.storage.get("session");
      return new Response(JSON.stringify(data || {}));
    }
    
    return new Response("Not found", { status: 404 });
}
};

function create_prompt(cv: string, job_desc: string): string {
  return `You are an expert ATS (Applicant Tracking System), called Taseen's ATS, analyzer and career consultant. Your task is to meticulously analyze a CV against a specific job description and provide actionable feedback.

    ## CV Content
    ${cv}

    ## Job Description
    ${job_desc}

    ## Analysis Framework

    ### 1. ATS Compatibility Assessment
    Evaluate the CV's ability to pass through ATS systems by checking:
    - **Keyword Matching**: Identify critical keywords from the job description (skills, technologies, certifications, job titles) and verify their presence in the CV
    - **Format Compatibility**: Assess if the CV uses ATS-friendly formatting (avoid tables, text boxes, headers/footers, graphics that might confuse parsers)
    - **Section Headers**: Check for standard section names (Experience, Education, Skills) that ATS systems recognize
    - **Contact Information**: Verify essential contact details are present and properly formatted
    - **File Format Compatibility**: Note if special formatting might cause parsing issues

    ### 2. Qualification Alignment
    - **Required vs. Actual**: Compare mandatory requirements against candidate's qualifications
    - **Experience Level**: Match years of experience and seniority level
    - **Technical Skills**: Cross-reference required technical skills with those listed
    - **Soft Skills**: Identify demonstrated soft skills matching job requirements
    - **Industry Experience**: Assess relevance of previous roles and industries
    - **Education & Certifications**: Verify educational requirements and relevant certifications

    ### 3. Content Quality Review
    - **Achievement Quantification**: Check for measurable results and metrics
    - **Action Verbs**: Assess use of strong action verbs
    - **Relevance**: Evaluate how well experience relates to the target role
    - **Clarity**: Check for clear, concise descriptions
    - **Gaps**: Identify unexplained employment gaps or missing information

    ## Scoring Methodology

    Calculate the ATS score (0-100) based on:
    - **Keyword Match Rate** (40 points): Percentage of critical keywords present
    - **Format Optimization** (20 points): ATS-friendly formatting
    - **Qualification Alignment** (25 points): How well qualifications match requirements
    - **Content Quality** (15 points): Professional presentation and achievement demonstration

    **Pass Threshold**: 80+ indicates strong likelihood of passing ATS and initial screening

    ## Output Requirements

    Return ONLY a valid JSON object with the following structure (no markdown, no code blocks, just the JSON):

    {
      "summary": "2-3 sentence overview highlighting the candidate's fit, key strengths, and primary gaps relative to the role",
      "pass": boolean,
      "atsScore": number,
      "strengths": [
        "Specific strength with evidence (e.g., '5 years Python experience matches required 3+ years')",
        "Include 3-5 concrete strengths tied to job requirements"
      ],
      "weaknesses": [
        "Specific gap or concern (e.g., 'Missing AWS certification listed as required')",
        "Include 3-5 notable weaknesses or missing elements"
      ],
      "improvements": [
        "Actionable change implementable in <10 minutes (e.g., 'Add \\"Agile/Scrum\\" to skills section')",
        "Include 4-7 quick wins that would improve ATS score or match"
      ]
    }

    ## Guidelines for Analysis

    **Be Specific**: Reference actual requirements from the job description and specific CV content

    **Be Honest**: Don't inflate scores; provide realistic assessment

    **Be Actionable**: Improvements should be concrete, not vague advice

    **Prioritize Impact**: Focus on changes that significantly affect ATS scoring

    **Consider Context**: Account for transferable skills and equivalent experience

    ## Example Quick Improvements
    - Adding missing keywords from job description
    - Reformatting bullet points with action verbs
    - Including specific tools/technologies mentioned in job posting
    - Adding quantifiable metrics to existing achievements
    - Renaming sections to standard ATS-recognized headers
    - Including relevant certifications or courses
    - Adjusting job titles to match industry standards while remaining truthful

    CRITICAL: Return ONLY valid JSON. Do not include any explanatory text, markdown formatting, or code blocks. Just the raw JSON object.`;
  }

export default {
  async fetch(request, env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const body = await request.json() as { cv: string; job_desc: string };
      
      if (!body.cv || !body.job_desc) {
        return new Response(
          JSON.stringify({ error: 'Missing cv or job_desc in request body' }), 
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      const prompt = create_prompt(body.cv, body.job_desc);

      const airesponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        prompt: prompt,
      }) as { response: string };

      const parsedResponse = JSON.parse(airesponse.response);

      return new Response(JSON.stringify(parsedResponse), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }), 
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  },
} satisfies ExportedHandler<Env>;
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
    if (url.pathname === "/add-chat" && request.method === "POST") {
      const { question, answer } = await request.json() as { question: string; answer: string };
      
      const data = await this.state.storage.get("session") as {    
        cv?: string;
        job_desc?: string;
        analysis?: any;
        timestamp?: number;
        chat_history?: Array<{ question: string; answer: string; timestamp: number }>;} || {};

      if (!data.chat_history) {
        data.chat_history = [];
      }
      
      // Add new chat message
      data.chat_history.push({ question, answer, timestamp: Date.now() });
      
      // Save back
      await this.state.storage.put("session", data);
  
      return new Response(JSON.stringify({ success: true }));
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
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { 
        status: 204,
        headers: corsHeaders 
      });
    }

    const url = new URL(request.url);

    if (url.pathname === "/analyze" && request.method === "POST") {
      try {
        const body = await request.json() as { cv: string; job_desc: string };
        
        if (!body.cv || !body.job_desc) {
        
          return new Response(
            JSON.stringify({ error: 'Missing cv or job_desc in request body' }), 
            { 
              status: 400,
              headers: corsHeaders
            }
          );
        }
        const prompt = create_prompt(body.cv, body.job_desc);
        const airesponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
          prompt: prompt,max_tokens: 2048
        }) as { response: string };

        let cleanedResponse = airesponse.response.trim();

        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '');
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '');

        const firstBrace = cleanedResponse.indexOf('{');
        const lastBrace = cleanedResponse.lastIndexOf('}');

        if (firstBrace === -1 || lastBrace === -1) {
          throw new Error('No JSON object found in AI response');
        }

        cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);

        const parsedResponse = JSON.parse(cleanedResponse);

        // STORE INTO DURABLE OBJECT
        const id = crypto.randomUUID();
        const durableObjectId = env.DURABLE_OBJECTS.idFromName(id);
        const durableObjectStub = env.DURABLE_OBJECTS.get(durableObjectId);

        await durableObjectStub.fetch("https://taseen/store", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cv: body.cv,
            job_desc: body.job_desc,
            analysis: parsedResponse,
            timestamp: Date.now(),
          }),
        });
      
        return new Response(JSON.stringify({
          session_id: id,
          ...parsedResponse, 
        }), {
          headers: corsHeaders
        });

      } catch (error) {
        console.error("Error processing /analyze request:", error);
        return new Response(
          JSON.stringify({ error: 'Invalid request format' }), 
          { 
            status: 400,
            headers: corsHeaders
          }
        );
      }
    }

    if (url.pathname === "/sessions") {
      if (request.method !== 'GET') {
        return new Response('Method not allowed', { 
          status: 405,
          headers: corsHeaders
        });
      }
      const session_id = url.searchParams.get("session_id");
      if (!session_id) {
        return new Response(JSON.stringify({ error: "Missing session_id" }), {
          status: 400,
          headers: corsHeaders
        });
      }

      const durableObjectId = env.DURABLE_OBJECTS.idFromName(session_id);
      const durableObjectStub = env.DURABLE_OBJECTS.get(durableObjectId);
      
      const response = await durableObjectStub.fetch("https://taseen/get");

      return new Response(await response.text(), {
        headers: corsHeaders
      });
    }

    if (url.pathname === "/chat" && request.method === "POST") {
      try {
        const body = await request.json() as { 
          session_id: string; 
          question: string; 
        };
        
        if (!body.session_id || !body.question) {
          return new Response(
            JSON.stringify({ error: 'Missing session_id or question' }), 
            { status: 400, headers: corsHeaders }
          );
        }

        // Get session data from Durable Object
        const durableObjectId = env.DURABLE_OBJECTS.idFromName(body.session_id);
        const durableObjectStub = env.DURABLE_OBJECTS.get(durableObjectId);
        const sessionResponse = await durableObjectStub.fetch("https://taseen/get");
        const sessionData = await sessionResponse.json() as {     
          cv: string;
          job_desc: string;
          analysis: any;
          chat_history?: Array<{ question: string; answer: string }>;};

        // Build chat prompt with context
        const chatPrompt = `You are an ATS career consultant. A candidate has asked a question about their CV analysis.

    Context:
    - CV: ${sessionData.cv}
    - Job Description: ${sessionData.job_desc}
    - Analysis: ${JSON.stringify(sessionData.analysis)}

    User Question: ${body.question}

    Provide a helpful, specific answer based on the analysis. Keep it concise (2-3 sentences).`;

        // Call AI
        const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
          prompt: chatPrompt,
          max_tokens: 512
        }) as { response: string };

        const answer = aiResponse.response.trim();

        // Store chat in Durable Object (you'll implement this next)
        await durableObjectStub.fetch("https://taseen/add-chat", {
          method: "POST",
          body: JSON.stringify({ question: body.question, answer })
        });

        return new Response(JSON.stringify({ answer }), {
          headers: corsHeaders
        });

      } catch (error) {
        console.error("Chat error:", error);
        return new Response(
          JSON.stringify({ error: 'Chat failed' }), 
          { status: 500, headers: corsHeaders }
        );
      }
    }
    return new Response("Not found", { 
      status: 404,
      headers: corsHeaders
    });
  },
} satisfies ExportedHandler<Env>;
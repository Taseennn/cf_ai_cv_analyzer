# Prompts

## Model Sonnet 4.5
### PROMPT
Based on the content of a cv, and a job description create a detailed base prompt, to analyze the cv and return a json that has this structure:

{
  "summary": "Short tldr of information below",
  "pass": true, /boolean to represet pass against ats or not\.
  "atsScore": out of 100, a score to represent a pass or not, a pass has to be 80+,
  "strengths": ["a list of strengths"],
  "weaknesses": ["a list of weaknesses"],
  "improvements": ["a list of quick short changes that can be implemented quickly (quickly is defined as in <10 minitues"]
}


### Model Sonnet 4.5
## PROMPT
Based on the sketch create a index.html, style.css page, with a dark and green theme

### Model Sonnet 4.5
## Prompt
Create me a prompt to answer follow up questions about user cv analysis


### Model Sonnet 4.5
## Prompt

I am getting the error, , "improvements": [
    "Add \"Agile/Scrum\" to skills section to increase ATS score",
✘ [ERROR] Error processing /analyze request: Error: No JSON object found in AI response, how can i parse the output to ensure JSON output"


### Model Copilot
## Prompt
Based on my project, create me detailed readme, to run the programe you can do
python3 -m http.server 8000
npm run dev or wrangler dev



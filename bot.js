// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, MessageFactory } = require('botbuilder');

class DentaBot extends ActivityHandler {
    constructor(configuration, qnaOptions) {
        super();

        this.onMessage(async (context, next) => {
            const userQuestion = context.activity.text;
            const textLower = userQuestion.toLowerCase();
            
            // ----------------------------------------------------------------
            // PHASE 3 BYPASS: LOCAL INTENT RECOGNITION (LUIS REPLACEMENT)
            // ----------------------------------------------------------------
            // If the user asks about appointments, we intercept the intent here
            if (textLower.includes("appointment") || textLower.includes("available") || textLower.includes("schedule")) {
                await context.sendActivity("I can help with that! Here are the available appointment times:");
                
                // Simulating the response from our Dentist Scheduler API
                const availability = ["8am", "9am", "10am", "11am", "12pm", "1pm", "2pm", "3pm", "4pm"];
                await context.sendActivity(availability.join(", "));
                
                await next();
                return; // Stop execution so it doesn't also ask QnA Maker
            }

            // ----------------------------------------------------------------
            // PHASE 2: QNA MAKER FALLBACK (AZURE LANGUAGE SERVICE)
            // ----------------------------------------------------------------
            const endpoint = "https://marco-contoso-language.cognitiveservices.azure.com/language/:query-knowledgebases?projectName=ContosoFAQ&api-version=2021-10-01&deploymentName=production";
            
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Ocp-Apim-Subscription-Key': 'FZT77gLjvaeIMlGHQXMVbB42FhgthasOvX7vpdi74EukMP84kodyJQQJ99CCACYeBjFXJ3w3AAAaACOGchpY',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        question: userQuestion,
                        top: 1
                    })
                });

                const data = await response.json();

                if (data.answers && data.answers.length > 0 && data.answers[0].answer !== "No good match found in KB.") {
                    await context.sendActivity(data.answers[0].answer);
                } else {
                    await context.sendActivity("I'm sorry, I don't have an answer for that yet.");
                }
            } catch (err) {
                console.error("API Error:", err);
                await context.sendActivity("Sorry, my brain is having trouble connecting to Azure right now.");
            }
            
            await next();
        });

        // Welcome Message & Data Governance Guardrail
        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Hello! I am the Contoso Assistant. I can help you with FAQs and scheduling. For your privacy, please do not share sensitive personal medical information in this chat.';
            
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
                }
            }
            await next();
        });
    }
}

module.exports.DentaBot = DentaBot;
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function generateSearchSuggestions(idea, state) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: `You are a helpful assistant that suggests specific types of local businesses and search terms for Google Maps based on user ideas. 
                    Provide 3-5 specific business types that would be relevant to the user's idea and likely to be found in ${state}. 
                    Format your response as a JSON array of objects with 'businessType' and 'location' properties.`
                },
                {
                    role: "user",
                    content: `I'm looking for: ${idea} in ${state}`
                }
            ],
            response_format: { type: "json_object" }
        });

        // Parse the response
        const content = JSON.parse(completion.choices[0].message.content);
        return content.suggestions || [];
    } catch (error) {
        console.error('Error generating search suggestions:', error);
        throw new Error('Failed to generate search suggestions');
    }
}

export { generateSearchSuggestions };

// Please install OpenAI SDK first: `npm install openai`

//import OpenAI from "openai";
const OpenAI = require('openai');
const axios = require('axios');
const apiKey= 'sk-ac972af6d763480aa2390a48e0697fae';

const openai = new OpenAI({
        baseURL: 'https://api.deepseek.com/v1',
        apiKey: apiKey
});

async function chatWith(yourMesssge) {
    console.log('call ai=' + yourMesssge);
    const completion = await openai.chat.completions.create({
        messages: [{ role: "system", content: yourMesssge }],
        model: "deepseek-chat",
    });

  console.log(completion.choices[0].message.content);
  return completion.choices[0].message.content
}



function balance(){
    let config = {
        method: 'get',
        maxBodyLength: Infinity,
      url: 'https://api.deepseek.com/user/balance',
      headers: { 
        'Accept': 'application/json', 
        'Authorization': 'Bearer '+apiKey
      }
    };
    
    return axios(config).then((response) => {
      console.log(JSON.stringify(response.data));
      return response;
    })
    .catch((error) => {
      console.log(error);
    });
}

module.exports = {chatWith, balance};
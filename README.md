# Personalrecord
 - A training programming website for various types of training, including powerlifting, weightlifting, and aerobic exercise. 
 - Use the Line bot to record your training performance.
 - (TBD)Organize the training records into charts to track long-term trends.
 - (TBD) Create a training schedule.

# System Diagram
![alt text](https://github.com/cancerpio/personalrecord/blob/main/Backend%E6%9E%B6%E6%A7%8B%E5%9C%96.drawio.png)
# Tchnique stack
 - Cloud & Container
   - AWS Lambda, API Gateway, EC2, Docker
 - DB & Message queue
   - MongoDB, Kafka
 - Programming language
   - Java Spring boot, NodeJS
 - Library
   - KafkaJS, Koa, jackson, line-bot-api-client, com.theokanning.openai-gpt3-java    

# How it work (Backend)
 - LinebotHandler
   - A Kafka Producer implemented in NodeJS 
   - Utilize AWS Lambda and API Gateway to handle the text event, which is a web hook received from the Linebot Platform 
   - Utilize kafkaJs to produce the user message (training performance) and reply token to kafka topic
    
 - Docker: docker-compose
   - kafka, mongodb
 - Bot Server
   - Springboot Kafka Consumer 
   - Consume the message from the user and perform the following actions: 
     - Convert the message into JSON format and retrieve training advice from OPENAI
     - Deserialize the JSON array and store it in MongoDB 
     - Send the training advice as a reply to the linebot platform



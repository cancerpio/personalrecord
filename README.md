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
 - LinebotHandler https://github.com/cancerpio/linebot-handler-node
   - A Kafka Producer implemented in NodeJS 
   - How to deploy
     - deploy script: https://github.com/cancerpio/linebot-handler-node/blob/master/deploy.sh
     - document: https://medium.com/@cancerpio/deploy-aws-lambda-by-aws-cli-b833f92040d7
   - Utilize AWS Lambda and API Gateway to handle the text event, which is a web hook received from the Linebot Platform 
   - Utilize kafkaJs to produce the user message (training performance) and reply token to kafka topic
    
 - Docker: docker-compose
   - Kafka: https://medium.com/@cancerpio/kafka-%E9%81%A0%E7%AB%AF%E9%80%A3%E7%B7%9A%E5%88%B0docker%E7%9A%84kafka-557aa7e5da3e
   - MongoDB: https://medium.com/@cancerpio/mongo-如何使用docker-compose設置一個包含初始資料庫和使用者驗證的mongodb-service-1578733187f2 
 - Bot Server https://github.com/cancerpio/nextpage-line-bot-server
   - Springboot Kafka Consumer 
   - Consume the message from the user and perform the following actions: 
     - Convert the message into JSON format and retrieve training advice from OPENAI
     - Deserialize the JSON array and store it in MongoDB 
     - Send the training advice as a reply to the linebot platform



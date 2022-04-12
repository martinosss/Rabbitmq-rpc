# Rabbitmq rpc

Simple implementation of RPC with rabbitmq

## Usage

```javascript
const RabbitmqRPC = require('rabbitmq-rpc.js');
const amqp = require("amqplib");

const example = async () => {
    const rabbitmqRPC = new RabbitmqRPC({
        timeout: 5000
    })

    await rabbitmqRPC.connect(await amqp.connect('amqp://localhost'))
    
    await rabbitmqRPC.subscribe('queue-example', (message) => {
        console.log(message)
        
        return 'Pong'
    })
    
    
    const response = await rabbitmqRPC.publish('queue-example', 'Ping')
    
    console.log(response)
}

example()
```

### Result:

```
Ping
Pong
```
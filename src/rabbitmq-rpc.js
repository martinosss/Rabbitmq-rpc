const { v4: uuidv4 } = require('uuid')

class RabbitmqRPC {
  constructor({ timeout = 5000 } = {}) {
    this.timeout = timeout
    this.connection = null
    this.channel = null
    this.queue = null
    this.requests = {}
  }

  async connect(connection) {
    this.connection = connection
    this.channel = await this.connection.createChannel()
    this.queue = await this.channel.assertQueue('', { exclusive: true })
    this.channel.consume(
      this.queue.queue,
      (response) => {
        const { correlationId } = response.properties
        const request = this.requests[correlationId]

        if (request) request.resolve(JSON.parse(response.content.toString()))

        delete this.requests[correlationId]
      },
      {
        noAck: true,
      }
    )
  }

  async subscribe(queue, callback) {
    await this.channel.assertQueue(queue, { durable: false })
    await this.channel.consume(queue, async (data) => {
      const response = await callback(JSON.parse(data.content.toString()))

      this.channel.sendToQueue(
        data.properties.replyTo,
        Buffer.from(JSON.stringify(response)),
        { correlationId: data.properties.correlationId }
      )
      this.channel.ack(data)
    })
  }

  async publish(queue, data = {}) {
    const correlationId = uuidv4()
    await this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), {
      correlationId,
      replyTo: this.queue.queue,
    })
    return new Promise((resolve) => {
      this.requests[correlationId] = { resolve }

      setTimeout(() => {
        if (this.requests[correlationId]) {
          delete this.requests[correlationId]

          resolve(null)
        }
      }, this.timeout)
    })
  }
}

module.exports = RabbitmqRPC

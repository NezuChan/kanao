import amqplib from "amqplib";
import { amqp } from "../config.js";

export async function createAmqpChannel() {
    const connection = await amqplib.connect(amqp);
    return connection.createChannel();
}

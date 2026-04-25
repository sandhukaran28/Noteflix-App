"use strict";

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const DDB_TABLE = process.env.DDB_TABLE || "noteflix";
const DDB_PK_NAME = "userId";

const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  ...(process.env.DDB_LOCAL_ENDPOINT ? { endpoint: process.env.DDB_LOCAL_ENDPOINT } : {}),
});
const ddb = DynamoDBDocumentClient.from(ddbClient);

function userIdFromReqUser(user) {
  const id = user?.sub || user?.username || user?.["cognito:username"];
  if (id) return String(id);
  if (process.env.DEV_USER_ID) return String(process.env.DEV_USER_ID);
  throw new Error("authenticated user has no sub/username");
}

const sks = {
  asset: (id) => `ASSET#${id}`,
  job:   (id) => `JOB#${id}`,
  chap:  (jobId, id) => `CHAP#${jobId}#${id}`,
};

async function putItem(item) {
  await ddb.send(new PutCommand({ TableName: DDB_TABLE, Item: item }));
}

async function getItem(pk, sk) {
  const out = await ddb.send(new GetCommand({
    TableName: DDB_TABLE,
    Key: { [DDB_PK_NAME]: pk, sk },
  }));
  return out.Item || null;
}

async function updateItem(pk, sk, expr, names, values) {
  await ddb.send(new UpdateCommand({
    TableName: DDB_TABLE,
    Key: { [DDB_PK_NAME]: pk, sk },
    UpdateExpression: expr,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

async function deleteItem(pk, sk) {
  await ddb.send(new DeleteCommand({
    TableName: DDB_TABLE,
    Key: { [DDB_PK_NAME]: pk, sk },
  }));
}

async function queryByPrefix(pk, skPrefix, { hardCap = 5000 } = {}) {
  let items = [];
  let ExclusiveStartKey;
  do {
    const res = await ddb.send(new QueryCommand({
      TableName: DDB_TABLE,
      KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :p)",
      ExpressionAttributeNames: { "#pk": DDB_PK_NAME, "#sk": "sk" },
      ExpressionAttributeValues: { ":pk": pk, ":p": skPrefix },
      ExclusiveStartKey,
    }));
    if (res.Items?.length) items.push(...res.Items);
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey && items.length < hardCap);
  return items;
}

async function scanBySkPrefix(skPrefix, { hardCap = 5000 } = {}) {
  let items = [];
  let ExclusiveStartKey;
  do {
    const res = await ddb.send(new ScanCommand({
      TableName: DDB_TABLE,
      FilterExpression: "begins_with(#sk, :p)",
      ExpressionAttributeNames: { "#sk": "sk" },
      ExpressionAttributeValues: { ":p": skPrefix },
      ExclusiveStartKey,
    }));
    if (res.Items?.length) items.push(...res.Items);
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey && items.length < hardCap);
  return items;
}

async function putJobEvent(jobId, userId, status, message = "") {
  if (!userId) {
    console.warn("DDB putJobEvent skipped: missing userId");
    return;
  }
  const now = new Date().toISOString();
  const item = {
    [DDB_PK_NAME]: userId,
    sk: `JOB#${jobId}#EVENT#${now}#${status}`,
    jobId,
    status,
    message,
    createdAt: now,
    entity: "event",
  };
  try {
    await putItem(item);
  } catch (e) {
    console.warn("DDB putJobEvent failed:", e.message || e);
  }
}

async function getJobEvents(jobId, userId) {
  if (!userId) throw new Error("missing userId");
  const res = await ddb.send(new QueryCommand({
    TableName: DDB_TABLE,
    KeyConditionExpression: "#pk = :u AND begins_with(#sk, :prefix)",
    ExpressionAttributeNames: { "#pk": DDB_PK_NAME, "#sk": "sk" },
    ExpressionAttributeValues: {
      ":u": userId,
      ":prefix": `JOB#${jobId}#EVENT#`,
    },
  }));
  return res.Items || [];
}

module.exports = {
  ddb, DDB_TABLE, DDB_PK_NAME,
  sks,
  putItem, getItem, updateItem, deleteItem, queryByPrefix,
  scanBySkPrefix,
  userIdFromReqUser,
  putJobEvent, getJobEvents,
};

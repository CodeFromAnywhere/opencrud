import { Redis } from "@upstash/redis";
import { getUpstashRedisDatabase } from "@/upstashRedis";
import { Endpoint, EndpointContext } from "@/client";
import { getDatabaseDetails } from "@/getDatabaseDetails";
import { embeddingsClient } from "./embeddings";

export type ActionSchemaDeleteResponse = {
  isSuccessful: boolean;
  message: string;
  deleteCount?: number;
};

export const remove: Endpoint<"remove"> = async (context) => {
  const { rowIds, databaseSlug, Authorization } = context;

  const { databaseDetails } = await getDatabaseDetails(databaseSlug);

  if (!databaseDetails) {
    return { isSuccessful: false, message: "Couldn't find database details" };
  }

  if (
    databaseDetails.authToken !== undefined &&
    databaseDetails.authToken !== "" &&
    Authorization !== `Bearer ${databaseDetails.authToken}`
  ) {
    return { isSuccessful: false, message: "Unauthorized" };
  }

  if (rowIds === undefined || rowIds.length === 0) {
    return { isSuccessful: false, message: "Invalid inputs" };
  }

  const redis = new Redis({
    url: `https://${databaseDetails.endpoint}`,
    token: databaseDetails.rest_token,
  });

  databaseDetails.vectorIndexColumnDetails?.map((item) => {
    const { vectorRestUrl, vectorRestToken } = item;
    return embeddingsClient.deleteVector({
      vectorRestUrl,
      vectorRestToken,
      ids: rowIds,
    });
  });

  const deleteCount = await redis.del(...rowIds);

  return { isSuccessful: true, message: "Row(s) deleted", deleteCount };
};

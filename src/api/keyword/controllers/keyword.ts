import axios from "axios";
import qs from "qs";
import { isEmpty } from "lodash";

const FREEPIK_KEY = process.env?.FREEPIK_KEY ?? "";
const BASE_URL = process.env?.FREEPIK_BASE_URL ?? "";
const LIMIT = 25;

// Create axios instance
const instance = axios.create({
  headers: {
    "x-freepik-api-key": FREEPIK_KEY,
  },
  baseURL: BASE_URL,
});

// Checking expired token
function isTokenExpired(expTimestamp: number) {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  return currentTimestamp > expTimestamp;
}

// Checking expired token from URL
function checkIsTokenExpired(url: string) {
  const expMatch = url.match(/exp=(\d+)/);

  if (expMatch) {
    const expTimestamp = parseInt(expMatch[1], 10);

    // Checking expiration of token
    const expired = isTokenExpired(expTimestamp);

    if (expired) {
      return true; // Token is expired
    } else {
      return false; // Token still valid!
    }
  }

  return true;
}

export default {
  // Get / Search by keyword
  async getKeyword(ctx) {
    const { name = "", page = 1 } = ctx?.query;

    // Giving error when query name not found
    if (typeof name !== "string" || name.length === 0) {
      ctx.response.status = 400;
      ctx.response.message = "Bad request";
      return;
    }

    // Create query params
    const params = qs.stringify(
      {
        page,
        term: name, // Search by slug name
        limit: LIMIT,
        order: "relevance",
        filters: {
          license: {
            freemium: 1,
            // premium: 0,
          },
          vector: {
            // 'jpg' | 'ai' | 'eps' | 'svg' | 'png'
            type: "svg",
            // 'watercolor' | 'flat' | 'cartoon' | 'geometric' | 'gradient' | 'isometric' | '3d' | 'hand-drawn'
            style: "hand-drawn",
          },
          orientation: {
            square: 1, // Show a square orientation image
          },
          // Only show from Freepik creators!
          author: 23,
        },
      },
      { encodeValuesOnly: true }
    );

    // Finding image from Freepik API
    try {
      const res = await instance.get(`/v1/resources?${params}`);

      // Success return
      ctx.response.status = 200;
      ctx.response.body = JSON.stringify({
        data: res?.data?.data ?? [],
        meta: {
          pagination: {
            page: res?.data?.meta?.current_page ?? 1,
            pageSize: LIMIT,
            pageCount: res?.data?.meta?.per_page ?? 1,
            total: res?.data?.meta?.total ?? 1,
          },
        },
      });
      ctx.response.message = "Success";
    } catch (error: any) {
      ctx.response.status = error?.response?.status ?? 400;
      ctx.response.message = error?.response?.message ?? "Failed to get image!";
    }
  },
  // Get asset by resource-id
  async getAsset(ctx) {
    const apiDownloadedImage = "api::downloaded-image.downloaded-image";
    const { resource_id } = ctx?.query;

    // Giving error when resource_id not found
    if (isEmpty(resource_id)) {
      ctx.response.status = 404;
      ctx.response.message = "Not found!";
      return;
    }

    // Get resource_id from database (table downloaded-image)
    const findResourceID = await strapi
      .documents(apiDownloadedImage)
      .findFirst({
        filters: {
          resource_id: {
            $eq: resource_id,
          },
        },
      });

    // Checking if resource_id is exist & token of Freepik image is not expired!
    if (findResourceID && !checkIsTokenExpired(findResourceID?.url ?? "")) {
      ctx.response.status = 200;
      ctx.response.body = JSON.stringify({
        data: [
          {
            filename: (findResourceID?.resource_id ?? 0).toString(),
            url: findResourceID?.url,
          },
        ],
      });
      ctx.response.message = "Success";
      return;
    }

    // Get detail of resource_id
    try {
      const res = await instance.get(`/v1/resources/${resource_id}/download/svg`);

      // Also save / update it to database
      if (findResourceID) {
        // Update it to database (if exist)
        await strapi.documents(apiDownloadedImage).update({
          documentId: findResourceID.documentId,
          data: {
            resource_id,
            url: (res?.data?.data ?? [])[0]?.url ?? "",
          },
        });
      } else {
        // Save it to database (if not exist)
        await strapi.documents(apiDownloadedImage).create({
          data: {
            resource_id,
            url: (res?.data?.data ?? [])[0]?.url ?? "",
          },
          // status: "published",
        });
      }

      // Success return
      ctx.response.status = 200;
      ctx.response.body = JSON.stringify({
        data: res?.data?.data ?? [],
        meta: {},
      });
      ctx.response.message = "Success";
    } catch (error: any) {
      ctx.response.status = error?.response?.status ?? 400;
      ctx.response.body = JSON.stringify({
        data: null,
        error: {
          status: error?.response?.status ?? 400,
          name: error?.message,
          message:
            error?.response?.data?.message ?? "Failed to get image detail!",
        },
      });
      ctx.response.message =
        error?.response?.data?.message ?? "Failed to get image detail!";
    }
  },
};

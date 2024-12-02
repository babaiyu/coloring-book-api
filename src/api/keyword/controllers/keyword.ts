import axios from "axios";
import qs from "qs";
import { isEmpty } from "lodash";

const FREEPIK_KEY = process.env?.FREEPIK_KEY ?? "";
const BASE_URL = process.env?.FREEPIK_BASE_URL ?? "";
const LIMIT = 25;
const RESOURCE_FORMAT = "png";

// Create axios instance
const instance = axios.create({
  headers: {
    "x-freepik-api-key": FREEPIK_KEY,
  },
  baseURL: BASE_URL,
});

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
        filters: {
          license: {
            freemium: 1,
            // premium: 0,
          },
          vector: {
            type: "png", // 'jpg' | 'ai' | 'eps' | 'svg' | 'png'
            style: "hand-drawn", // 'watercolor' | 'flat' | 'cartoon' | 'geometric' | 'gradient' | 'isometric' | '3d' | 'hand-drawn'
          },
          orientation: {
            square: 1, // Show a square orientation image
          },
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
    const { resource_id } = ctx?.query;

    // Giving error when resource_id not found
    if (isEmpty(resource_id)) {
      ctx.response.status = 404;
      ctx.response.message = "Not found!";
      return;
    }

    // Get detail of resource_id
    try {
      const res = await instance.get(
        `/v1/resources/${resource_id}/download/${RESOURCE_FORMAT}`
      );

      // Success return
      ctx.response.status = 200;
      ctx.response.body = JSON.stringify({
        data: res?.data?.data ?? null,
        meta: {},
      });
      ctx.response.message = "Success";
    } catch (error: any) {
      ctx.response.status = error?.response?.status ?? 400;
      ctx.response.message =
        error?.response?.message ?? "Failed to get image detail!";
    }
  },
};

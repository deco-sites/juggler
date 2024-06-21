import { allowCorsFor } from "deco/mod.ts";
import { createClient } from "https://esm.sh/@clickhouse/client-web@1.2.0";
import { AppContext } from "site/apps/site.ts";

/**
 * Represents an event.
 */
interface Event {
  hostname: string;
  site_id: number;
  user_id: number;
  event_type: string;
  session_id: number;
  start_time: string; // DateTime type, represented as string in TypeScript
  duration: number;
  is_bounce: boolean;
  entry_page: string;
  exit_page: string;
  exit_page_hostname: string;
  pageviews: number;
  events: number;
  sign: number;
  entry_meta: {
    key: string[];
    value: string[];
  };
  utm_medium: string;
  utm_source: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  referrer: string;
  referrer_source: string;
  country_code: string; // LowCardinality(FixedString(2)), represented as string
  subdivision1_code: string; // LowCardinality(String), represented as string
  subdivision2_code: string; // LowCardinality(String), represented as string
  city_geoname_id: number;
  screen_size: string; // LowCardinality(String), represented as string
  operating_system: string; // LowCardinality(String), represented as string
  operating_system_version: string; // LowCardinality(String), represented as string
  browser: string; // LowCardinality(String), represented as string
  browser_version: string; // LowCardinality(String), represented as string
  timestamp: string; // DateTime type, represented as string in TypeScript
  transferred_from: string;
}

const CLICKHOUSE_ADDRESS = Deno.env.get("CLICKHOUSE_ADDRESS");
const CLICKHOUSE_PASSWORD = Deno.env.get("CLICKHOUSE_PASSWORD");
const CLICKHOUSE_USERNAME = "default";

if (!CLICKHOUSE_ADDRESS || !CLICKHOUSE_PASSWORD) {
  console.warn(
    "ClickHouse environment variables are not defined. ClickHouse functionality is now limited."
  );
}

/**
 * Sends an event to the event tracker.
 * @param event - The event to be sent.
 * @param _req - The request object (unused in this function).
 * @returns A promise that resolves to an object with the status of the operation or an error message.
 */
async function sendEvent({ event }: { event: Event }, req: Request, ctx: AppContext) {

  Object.entries(allowCorsFor(req)).map(([name, value]) => {
    ctx.response.headers.set(name, value);
  });

  const table = "event_tracker";
  const client = createClient({
    url: ctx.clickhouseAddress,
    username: ctx.clickhouseUsername,
    password: ctx.clickhousePassword.get(),
  });

  try {
    await client.insert({
      table,
      values: [event],
      format: "JSONEachRow",
      clickhouse_settings: {
        async_insert: 1,
        wait_for_async_insert: 1,
      },
    });

    return {
      status: "success",
    };
  } catch (error) {
    console.error(error);
    return {
      error: error.message,
    };
  }
}

export default sendEvent;

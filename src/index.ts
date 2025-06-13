import {Server} from "@modelcontextprotocol/sdk/server/index.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ErrorCode,
	ListToolsRequestSchema,
	McpError,
} from "@modelcontextprotocol/sdk/types.js";
import axios, {AxiosInstance} from "axios";

// Types based on the Poliscope API
interface Entity {
	rs: string;
	name: string;
	type: "0" | "10" | "40" | "50" | "60" | "pr";
	ris?: any;
	population?: number;
	street?: string;
	plz?: string;
	parent?: Entity | string;
	children?: Entity[] | string[];
	state?: Entity | string;
	weblinks: Array<{
		type: "homepage" | "wikipedia" | "bauleitplanung" | "other";
		url: string;
	}>;
	bounds?: any;
}

interface Meeting {
	id: string;
	ris: any;
	dateCreated: string;
	dateModified: string;
	date: string;
	title: string;
	location?: string;
	cancelled?: boolean;
	urls: Array<{url: string; type: string}>;
	topics?: Topic[];
	procedures?: string[];
	agendaItems?: AgendaItem[];
	documents?: Document[];
}

interface Topic {
	id: string;
	name: string;
	description: string;
	allowedParentTopics?: string[];
}

interface AgendaItem {
	id: number;
	title: string;
	number: string;
	meeting: Meeting | string;
	topics?: Topic[];
	procedures?: string[];
}

interface Document {
	id: string;
	dateCreated: string;
	file?: any;
	url: string;
	meeting?: Meeting | string;
	agendaItem?: AgendaItem | string;
	type: "beschluss" | "invitation" | "vorlage" | "other";
}

interface PaginatedResponse<T> {
	data: T[];
	meta: {
		totalCount: number;
		filterCount: number;
	};
}

// Query parameter interfaces
interface EntityQueryParams {
	filter?: any;
	sort?: string;
	bbox?: string;
	fields?: string[];
	page?: number;
	limit?: number;
}

interface MeetingQueryParams {
	filter?: any;
	fields?: string[];
	sort?: string | string[];
	page?: number;
	limit?: number;
	entity_rs?: string[];
	topics?: string[];
	publicProcedures?: string[];
}

class PoliscopeAPI {
	private axios: AxiosInstance;

	constructor(apiKey: string, baseURL: string = "http://api.poliscope.test/v1") {
		this.axios = axios.create({
			baseURL,
			headers: {
				"x-api-key": apiKey,
				"Content-Type": "application/json",
			},
		});
	}

	// Entity endpoints
	async getEntity(rs: string, fields?: string[]): Promise<Entity | null> {
		const params: any = {};
		if (fields) params.fields = fields;

		const response = await this.axios.get(`/entities/${rs}`, {params});
		return response.data;
	}

	async getEntities(params: EntityQueryParams): Promise<PaginatedResponse<Entity>> {
		const response = await this.axios.post("/entities/query", params);
		return response.data;
	}

	async getEntityCount(params: {filter?: any; bbox?: string}): Promise<{count: number}> {
		const response = await this.axios.post("/entities/count", params);
		return response.data;
	}

	// Meeting endpoints
	async getMeetings(params: MeetingQueryParams): Promise<PaginatedResponse<Meeting>> {
		const response = await this.axios.post("/meetings/query", params);
		return response.data;
	}

	async getMeetingCount(params: {
		filter?: any;
		entity_rs?: string[];
		topics?: string[];
		publicProcedures?: string[];
	}): Promise<{count: number}> {
		const response = await this.axios.post("/meetings/count", params);
		return response.data;
	}
}

class PoliscopeMCPServer {
	private server: Server;
	private api: PoliscopeAPI;

	constructor(apiKey: string) {
		this.server = new Server(
			{
				name: "poliscope-mcp-server",
				version: "1.0.0",
			},
			{
				capabilities: {
					tools: {},
				},
			}
		);

		this.api = new PoliscopeAPI(apiKey);
		this.setupHandlers();
	}

	private setupHandlers() {
		this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
			tools: [
				{
					name: "get_entity",
					description:
						"Get an entity by its Regionalschlüssel (RS) with optional fields including children",
					inputSchema: {
						type: "object",
						properties: {
							rs: {
								type: "string",
								description: "Amtlicher Regionalschlüssel (RS) of the entity",
							},
							includeChildren: {
								type: "boolean",
								description: "Whether to include children entities",
								default: false,
							},
							fields: {
								type: "array",
								items: {type: "string"},
								description: "Specific fields to include (e.g., ['*', 'children.*'])",
							},
						},
						required: ["rs"],
					},
				},
				{
					name: "list_entities",
					description: "List entities with filtering, sorting, and pagination",
					inputSchema: {
						type: "object",
						properties: {
							filter: {
								type: "object",
								description: "Filter criteria (Directus filter format)",
							},
							sort: {
								type: "string",
								description: "Sort order (e.g., '-rs' for descending)",
							},
							bbox: {
								type: "string",
								description: "Bounding box filter: 'minLon,minLat,maxLon,maxLat'",
							},
							page: {
								type: "number",
								description: "Page number (default: 1)",
								minimum: 1,
							},
							limit: {
								type: "number",
								description: "Items per page (default: 10, max: 250)",
								minimum: 1,
								maximum: 250,
							},
						},
					},
				},
				{
					name: "count_entities",
					description: "Count entities matching filter criteria",
					inputSchema: {
						type: "object",
						properties: {
							filter: {
								type: "object",
								description: "Filter criteria",
							},
							bbox: {
								type: "string",
								description: "Bounding box filter: 'minLon,minLat,maxLon,maxLat'",
							},
						},
					},
				},
				{
					name: "get_meetings",
					description: "Get meetings with extensive filtering options",
					inputSchema: {
						type: "object",
						properties: {
							entity_rs: {
								type: "array",
								items: {type: "string"},
								description: "Filter by entity Regionalschlüssel",
							},
							topics: {
								type: "array",
								items: {type: "string"},
								description: "Filter by topics (e.g., ['windenergie', 'solarenergie'])",
							},
							publicProcedures: {
								type: "array",
								items: {type: "string"},
								description: "Filter by public procedures (e.g., ['bplan', 'fplan'])",
							},
							filter: {
								type: "object",
								description: "Additional filter criteria",
							},
							dateFrom: {
								type: "string",
								description: "Filter meetings from this date (ISO format)",
							},
							dateTo: {
								type: "string",
								description: "Filter meetings up to this date (ISO format)",
							},
							cancelled: {
								type: "boolean",
								description: "Include cancelled meetings",
							},
							page: {
								type: "number",
								description: "Page number (default: 1)",
								minimum: 1,
							},
							limit: {
								type: "number",
								description: "Items per page (default: 10, max: 250)",
								minimum: 1,
								maximum: 250,
							},
							sort: {
								type: "string",
								description: "Sort order (e.g., '-date' for newest first)",
							},
						},
					},
				},
				{
					name: "count_meetings",
					description: "Count meetings matching filter criteria",
					inputSchema: {
						type: "object",
						properties: {
							entity_rs: {
								type: "array",
								items: {type: "string"},
								description: "Filter by entity Regionalschlüssel",
							},
							topics: {
								type: "array",
								items: {type: "string"},
								description: "Filter by topics",
							},
							publicProcedures: {
								type: "array",
								items: {type: "string"},
								description: "Filter by public procedures",
							},
							filter: {
								type: "object",
								description: "Additional filter criteria",
							},
						},
					},
				},
			],
		}));

		this.server.setRequestHandler(CallToolRequestSchema, async request => {
			const {name, arguments: args} = request.params;

			try {
				switch (name) {
					case "get_entity": {
						const {rs, includeChildren, fields} = args as any;
						const fieldsArray = fields || (includeChildren ? ["*", "children.*"] : ["*"]);
						const entity = await this.api.getEntity(rs, fieldsArray);

						if (!entity) {
							return {
								content: [
									{
										type: "text",
										text: `No entity found with RS: ${rs}`,
									},
								],
							};
						}

						return {
							content: [
								{
									type: "text",
									text: JSON.stringify(entity, null, 2),
								},
							],
						};
					}

					case "list_entities": {
						const params = args as EntityQueryParams;
						const response = await this.api.getEntities({
							filter: params.filter || {},
							sort: params.sort || "-rs",
							bbox: params.bbox,
							page: params.page || 1,
							limit: params.limit || 10,
							fields: params.fields || ["*"],
						});

						return {
							content: [
								{
									type: "text",
									text: JSON.stringify(response, null, 2),
								},
							],
						};
					}

					case "count_entities": {
						const {filter, bbox} = args as any;
						const response = await this.api.getEntityCount({filter, bbox});

						return {
							content: [
								{
									type: "text",
									text: `Total entities matching criteria: ${response.count}`,
								},
							],
						};
					}

					case "get_meetings": {
						const {dateFrom, dateTo, cancelled, ...params} = args as any;

						// Build filter object
						const filter: any = params.filter || {};
						if (dateFrom || dateTo) {
							filter.date = {};
							if (dateFrom) filter.date._gte = dateFrom;
							if (dateTo) filter.date._lte = dateTo;
						}
						if (cancelled !== undefined) {
							filter.cancelled = {_eq: cancelled};
						}

						const response = await this.api.getMeetings({
							...params,
							filter,
							page: params.page || 1,
							limit: params.limit || 10,
							sort: params.sort || "-date",
						});

						return {
							content: [
								{
									type: "text",
									text: JSON.stringify(response, null, 2),
								},
							],
						};
					}

					case "count_meetings": {
						const response = await this.api.getMeetingCount(args as any);

						return {
							content: [
								{
									type: "text",
									text: `Total meetings matching criteria: ${response.count}`,
								},
							],
						};
					}

					default:
						throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
				}
			} catch (error: any) {
				if (error.response) {
					throw new McpError(
						ErrorCode.InternalError,
						`API Error: ${error.response.status} - ${
							error.response.data?.message || error.response.statusText
						}`
					);
				}
				throw error;
			}
		});
	}

	async run() {
		const transport = new StdioServerTransport();
		await this.server.connect(transport);
	}
}

// Main entry point
async function main() {
	const apiKey = process.env.POLISCOPE_API_KEY;

	if (!apiKey) {
		console.error("Error: POLISCOPE_API_KEY environment variable is required");
		process.exit(1);
	}

	const server = new PoliscopeMCPServer(apiKey);
	await server.run();
}

main().catch(error => {
	console.error("Fatal error:", error);
	process.exit(1);
});

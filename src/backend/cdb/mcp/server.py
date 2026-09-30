import asyncio
from typing import Any
from mcp.server.models import InitializationOptions
import mcp.types as types
from mcp.server import NotificationOptions, Server
from mcp.server.stdio import stdio_server

# Importing CDB services
from cdb.services.persons import PersonService
from cdb.services.companies import CompanyService
from cdb.services.opportunities import OpportunityService
from cdb.services.account_briefs import AccountBriefService
from cdb.core.config import settings

# Initialize the MCP Server
server = Server("cdb-cloud-mcp")

# Initialize Services
# In a real production app, these would be injected via a dependency container
person_service = PersonService()
company_service = CompanyService()
opportunity_service = OpportunityService()
brief_service = AccountBriefService()

@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    """List available tools for CDB Cloud."""
    return [
        types.Tool(
            name="search_persons",
            description="Search for persons in the CDB database by name or email",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search term (name or email)"},
                },
                "required": ["query"],
            },
        ),
        types.Tool(
            name="get_company_signals",
            description="Retrieve all active signals for a specific company using its ID",
            inputSchema={
                "type": "object",
                "properties": {
                    "company_id": {"type": "string", "description": "The unique ID of the company"},
                },
                "required": ["company_id"],
            },
        ),
        types.Tool(
            name="create_opportunity",
            description="Create a new sales opportunity for a person at a company",
            inputSchema={
                "type": "object",
                "properties": {
                    "person_id": {"type": "string", "description": "The ID of the person"},
                    "company_id": {"type": "string", "description": "The ID of the company"},
                    "title": {"type": "string", "description": "Opportunity title"},
                    "value": {"type": "number", "description": "Estimated deal value"},
                },
                "required": ["person_id", "company_id", "title"],
            },
        ),
        types.Tool(
            name="get_account_brief",
            description="Generate or retrieve a strategic account brief for a company",
            inputSchema={
                "type": "object",
                "properties": {
                    "company_id": {"type": "string", "description": "The unique ID of the company"},
                },
                "required": ["company_id"],
            },
        ),
    ]

@server.call_tool()
async def handle_call_tool(
    name: str, arguments: dict | None
) -> list[types.TextContent | types.ImageContent | types.EmbeddedResource]:
    """Handle tool execution requests."""
    if not arguments:
        raise ValueError("Arguments are required")

    try:
        if name == "search_persons":
            query = arguments.get("query")
            results = person_service.search(query)
            if not results:
                return [types.TextContent(type="text", text=f"No persons found for: {query}")]
            
            output = "Found persons:\n" + "\n".join([f"- {p.full_name} ({p.email}) [ID: {p.id}]" for p in results])
            return [types.TextContent(type="text", text=output)]

        elif name == "get_company_signals":
            cid = arguments.get("company_id")
            signals = company_service.get_signals(cid)
            if not signals:
                return [types.TextContent(type="text", text=f"No active signals found for company {cid}")]
            
            output = f"Active signals for company {cid}:\n" + "\n".join([f"- {s.title}: {s.description} (Priority: {s.priority})" for s in signals])
            return [types.TextContent(type="text", text=output)]

        elif name == "create_opportunity":
            pid = arguments.get("person_id")
            cid = arguments.get("company_id")
            title = arguments.get("title")
            val = arguments.get("value", 0)
            
            opp = opportunity_service.create(person_id=pid, company_id=cid, title=title, value=val)
            return [types.TextContent(type="text", text=f"Successfully created opportunity {opp.id}: {opp.title}")]

        elif name == "get_account_brief":
            cid = arguments.get("company_id")
            brief = brief_service.generate_brief(cid)
            return [types.TextContent(type="text", text=f"Account Brief for {cid}:\n\n{brief}")]

    except Exception as e:
        return [types.TextContent(type="text", text=f"Error executing {name}: {str(e)}")]

    raise ValueError(f"Unknown tool: {name}")

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="cdb-cloud-mcp",
                server_version="0.1.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )

if __name__ == "__main__":
    asyncio.run(main())

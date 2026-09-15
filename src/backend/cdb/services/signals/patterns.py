"""
cdb.services.signals.patterns

Compiled regular-expression constants shared across all signal detectors.
Centralising them here keeps each detector file focused on detection logic
and makes the patterns easy to review and tune in isolation.
"""

import re

# ─────────────────────────────────────────────────────────────────────────────
# Unanswered Conversation detectors
# ─────────────────────────────────────────────────────────────────────────────

# Matches commercial intent / gig / project opportunity phrasing.
COMMERCIAL_OPPORTUNITY_REGEX = re.compile(
    r"\b("
    r"proposal|sow|statement of work|scope of work|project scope|"
    r"project budget|budget for (?:the project|consulting)|"
    r"rate card|hourly rate|daily rate|fixed price|retainer|"
    r"pilot project|proof of concept|poc|contract renewal|contract terms|sign(?:ing)? the contract|"
    r"hire you|hire us|work together|partner with us|collaborate on|"
    r"need your help|need help with|looking for assistance|"
    r"looking for (?:architectural\s+|data\s+|technical\s+)?consulting|architectural consulting|"
    r"consulting on|inquiry regarding|"
    r"provide a quote|cost estimate|commercial terms|master service agreement|msa"
    r")\b",
    re.IGNORECASE,
)

# Matches expert-network / recruiting noise that should be excluded.
EXCLUDE_CONVERSATION_REGEX = re.compile(
    r"\b("
    r"visasq|alphasights|guidepoint|dialectica|newtonx|glg|gerson\s+lehrman|"
    r"paid\s+independent\s+phone\s+consultation|paid\s+consultation\s+on\s+this\s+topic|"
    r"talent\s+acquisition|book\s+a\s+slot\s+for\s+the\s+interview|send\s+me\s+your\s+(?:updated\s+)?cv|"
    r"salary\s+and\s+other\s+details\s+about\s+the\s+position|position\s+namely\s+business\s+intelligence|"
    r"expected\s+salary|current\s+salary|notice\s+period"
    r")\b",
    re.IGNORECASE,
)

# ─────────────────────────────────────────────────────────────────────────────
# Hiring & Funding detectors
# ─────────────────────────────────────────────────────────────────────────────

FUNDING_REGEX = re.compile(
    r"\b(seed\s+(?:round|funding|stage|investment|capital)|series\s+[abcde]|funding round|raised\s+[\$€£]?\d+|venture round|new capital|investment round)\b",
    re.IGNORECASE,
)

HIRING_REGEX = re.compile(
    r"\b("
    r"(?:hiring|recruiting|looking\s+for|expanding|seeking|onboarding)\s+(?:a\s+|an\s+|the\s+)?(?:data\s+engineer|analytics\s+engineer|lead\s+architect|data\s+lead)|"
    r"hiring\s+data|scaling\s+the\s+team|growing\s+the\s+team|headcount\s+growth|hiring\s+\d+\s+engineers|"
    r"(?:open|new)\s+(?:position|role|opening)s?\s+for\s+(?:data\s+engineer|analytics\s+engineer)"
    r")\b",
    re.IGNORECASE,
)

# ─────────────────────────────────────────────────────────────────────────────
# Competitor Signal detector
# ─────────────────────────────────────────────────────────────────────────────

COMPETITOR_REGEX = re.compile(
    r"\b("
    r"talking to another (?:consultancy|agency|firm|vendor|provider|team)|"
    r"evaluating (?:alternatives?|other options?|competitors?|other firms?|other agencies)|"
    r"considering another (?:consultancy|agency|firm|vendor|provider)|"
    r"competing proposal|competitive proposal|vendor bake-off|competitive bake-off|bake-off|bakeoff|"
    r"competitive rfp|rfp bake-off|comparing proposals?|"
    r"cheaper alternative|lower price from|"
    r"lost to (?:a )?competitor|competitor won|competitor chosen|"
    r"(?:evaluating|talking to|working with|hired|chose|selected|bringing in)\s+(?:slalom|thoughtworks|accenture|deloitte|mckinsey|bcg|bain|kearney|pwc|ey|kpmg)"
    r")\b",
    re.IGNORECASE,
)

# ─────────────────────────────────────────────────────────────────────────────
# Leadership Change detector
# ─────────────────────────────────────────────────────────────────────────────

EXECUTIVE_TITLE_REGEX = re.compile(
    r"\b("
    r"chief\s+(?:executive|technology|information|data|product|analytics|revenue|operating|commercial)?\s*officer|"
    r"chief\s+executive|chief|cto|cio|cdo|cpo|cro|ceo|coo|"
    r"vp|vice\s+president|"
    r"head\s+of\s+(?:data|analytics|engineering|tech|technology|product|ai|bi|platform|architecture|cloud|core\s+services|sales|solutions)|"
    r"(?:senior\s+)?director(?:\s*,\s*|\s+of\s+|\s+-\s+)(?:data|analytics|engineering|tech|technology|product|ai|bi|platform|architecture|cloud|sales|solutions)|"
    r"(?:data|analytics|engineering|tech|technology|product|ai|bi)\s+director|"
    r"founder|co-founder|managing\s+director"
    r")\b",
    re.IGNORECASE,
)

EXCLUDE_EXECUTIVE_TITLE_REGEX = re.compile(
    r"\b(medical\s+director|chapter\s+director|director\s+general|talent\s+management)\b",
    re.IGNORECASE,
)

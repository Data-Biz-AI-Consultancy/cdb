"""
cdb.services.signals.nba.playbooks

Default prescriptive action playbooks, steps, and metadata templates per signal type.
"""

from typing import Any

from cdb.schemas.nba import ActionType

DEFAULT_PLAYBOOKS: dict[str, dict[str, Any]] = {
    "dormant_strategic_account": {
        "playbook_key": "executive_touchpoint",
        "action_type": ActionType.SCHEDULE_SYNC,
        "title": "Schedule Executive Check-In or QBR",
        "description": "Reach out to past client sponsors with a relevant industry benchmark, new architectural case study, or offer a complimentary advisory check-in.",
        "steps": [
            "Review past engagement deliverables and executive sponsors",
            "Select relevant recent case study or industry benchmark",
            "Send personalized check-in email proposing a 30-minute strategic review",
        ],
    },
    "unanswered_conversation": {
        "playbook_key": "rapid_response",
        "action_type": ActionType.SEND_MESSAGE,
        "title": "Reply to Open Conversation Thread",
        "description": "Triage unanswered message thread immediately; draft and send a thoughtful reply addressing the client inquiry.",
        "steps": [
            "Review inbound message thread context and any pending requests",
            "Formulate detailed response with proposed next steps or meeting times",
            "Send reply via original communication channel",
        ],
    },
    "expiring_contract": {
        "playbook_key": "contract_renewal",
        "action_type": ActionType.PREPARE_PROPOSAL,
        "title": "Initiate Contract Extension & Scope Review",
        "description": "Draft extension proposal or schedule a scope review with the client procurement lead before the contract expiration milestone.",
        "steps": [
            "Audit current delivery milestones and remaining budget runway",
            "Draft contract extension addendum with updated rate terms and scope",
            "Schedule proposal presentation with account sponsor",
        ],
    },
    "leadership_change": {
        "playbook_key": "executive_reengagement",
        "action_type": ActionType.EXECUTIVE_TOUCHPOINT,
        "title": "Congratulate Contact & Establish Executive Cadence",
        "description": "Acknowledge contact promotion or transition to a new organization and establish senior partnership alignment.",
        "steps": [
            "Verify new role, title, and organization affiliation",
            "Draft congratulatory note emphasizing advisory continuity",
            "Propose introductory briefing on high-priority data/AI initiatives",
        ],
    },
    "hiring_funding_event": {
        "playbook_key": "expansion_pitch",
        "action_type": ActionType.EXECUTIVE_TOUCHPOINT,
        "title": "Propose Team Augmentation or Architecture Strategy",
        "description": "Engage executive leadership regarding recent funding allocation or engineering hiring expansion with tailored consulting capabilities.",
        "steps": [
            "Analyze public funding round details or posted job openings",
            "Align consulting practice capabilities with scaling bottlenecks",
            "Share bespoke practice deck and request discovery discussion",
        ],
    },
    "competitor_signal": {
        "playbook_key": "competitive_differentiation",
        "action_type": ActionType.INTERNAL_ALIGNMENT,
        "title": "Reinforce Value Proposition & Competitive Differentiation",
        "description": "Brief internal deal team on competitor positioning, address pricing or RFP considerations, and schedule executive sponsor touchpoint.",
        "steps": [
            "Review competitor mentions and deal stage notes",
            "Prepare competitive differentiation matrix highlighting specialized domain expertise",
            "Schedule executive alignment call to address client evaluation criteria",
        ],
    },
}

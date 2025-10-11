# Minimal permission map. Expand as features grow.
ROLE_PERMS = {
    "PROVIDER_ADMIN": {
        "care.edit","risk.edit","quotation.generate","docs.upload","docs.generate",
        "docs.submit_review"
    },
    "SERVICE_MANAGER": {
        "manager.queue","manager.approve","onboard.convert","roster.view","docs.view",
        "finance.view"
    },
    "SUPPORT_WORKER": {"care.view","roster.view","docs.view"},
    "PARTICIPANT": {"self.view"},
    "HR": {"roster.manage","worker.assign","worker.view"},
    "FINANCE": {"invoice.generate","invoice.sync","finance.view"},
    "IT": {"system.readonly"},
    "DATA_ENTRY": {"docs.upload","data.manage"}
}

def has_perm(role: str, perm: str) -> bool:
    return perm in ROLE_PERMS.get(role.upper(), set())

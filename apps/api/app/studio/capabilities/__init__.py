"""Studio capabilities.

`implementations.py` holds the capability set and builds the registry;
`validation.py` holds donor-adapted coercion/hygiene/ranking helpers; `critique.py`
holds the review-stage capability. `StudioCapability` itself is defined in
`app.studio.registry` to keep the contract in one place.
"""
from app.studio.capabilities import validation
from app.studio.capabilities.implementations import (
    ALL_CAPABILITIES,
    CTA_PLACEMENTS,
    HOOK_STYLES,
    MODIFIER_INSTRUCTIONS,
    build_registry,
)

__all__ = [
    "validation",
    "ALL_CAPABILITIES",
    "build_registry",
    "HOOK_STYLES",
    "CTA_PLACEMENTS",
    "MODIFIER_INSTRUCTIONS",
]

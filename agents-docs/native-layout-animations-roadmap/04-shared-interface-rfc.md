# Objective 04 — Agree on the Shared Native-Animation Boundary

## Goal

Prepare and review a team-facing RFC for the shared native-animation boundary.

## Result

The proposed RFC is separate from this internal roadmap:

- [Shared Native-Animation Boundary RFC](../rfcs/shared-native-animation-boundary.md)

## Internal status

The draft contains:

- common value, target, handle, result, and capability contracts;
- separate CSS, layout, coordinator, resolver, and executor duties;
- target ownership, cancel, handoff, and external lease rules;
- Apple Core Animation reuse through a temporary CSS adapter;
- an Android-neutral host boundary;
- staged adoption, test, and rollout plans;
- marked items for CSS, layout, Apple, and Android review.

The RFC still needs the owner reviews in its review record.

## Internal acceptance

This objective is complete when:

- the CSS owner accepts the shared scope or records objections;
- an Android-aware reviewer accepts the common contract;
- the layout and Apple owners accept the lifecycle and extraction plan;
- the RFC records the result of each review;
- accepted choices are updated in [DECISION-LOG.md](DECISION-LOG.md).

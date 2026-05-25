# Generation Pipeline Improvements Plan

Based on eBay's automated image generation framework, this document outlines improvements to Glyph's infographic generation pipeline.

## Overview

Current pipeline: Extract → Analyze → Generate Images → Store

Improved pipeline: Extract → Pre-process → Analyze → Generate → Evaluate → Optimize (loop) → Store

---

## 1. Content Pre-processing Enhancement
**Status: Done** ✅

### Approach
Raw article text from Exa is passed directly to insight extraction (NOT replaced with simplified text). The preprocessor extracts **supplementary metadata** that guides slide selection and visualization.

### Metadata Extracted
- **Content Type**: Free-form label (e.g., "technical argument", "narrative case study") — adapts insight extraction approach
- **Structure**: Article section headings with hierarchy levels — primary guide for which topics become slides
- **Statistics**: Numbers, percentages, data points with context — high-value for infographics
- **Quotes**: Impactful statements worth featuring visually
- **Comparisons**: X vs Y patterns — translate to side-by-side infographic layouts
- **Processes**: Sequential workflows — translate to flow diagrams

### Key Design Decisions
- **Enrich, don't replace**: Raw text is always the primary input. Metadata is supplementary guidance.
- **Structure-driven slides**: The author's section structure is the backbone of the deck. Slides align with the author's organizational choices.
- **Cap at 10-12 slides, no floor**: Slide count is driven by the article's structure, not a fixed number. Short articles get fewer slides.
- **Content-type agnostic**: Tested across 5 article types (technical argument, narrative case study, industry analysis, scientific history, research paper). No content-type-specific logic.

### Files Changed
- `src/lib/content-preprocessor.ts` — Rewritten to extract metadata instead of simplified text
- `src/lib/prompts.ts` — `INSIGHT_EXTRACTION_PROMPT` updated to be structure-driven and metadata-aware
- `src/lib/pipeline.ts` — Feeds raw text + metadata to insight extraction

---

## 2. Dynamic Prompt Optimization
**Status: Not Done** ❌

### Current State
- Static prompt template in `src/lib/prompts.ts`
- Same prompt style for all content types
- No adaptation based on article structure

### Proposed Improvements
- **Content Type Detection**: Classify articles (data-driven, narrative, technical, opinion)
- **Style Adaptation**: Adjust prompt style based on content type
- **Composition Guidelines**: Add specific layout instructions (hierarchy, flow, balance)
- **Visual Style Tuning**: Refine whiteboard style parameters (color palette, density)

### Implementation Steps
1. Add content type classifier to preprocessor
2. Create prompt templates for each content type
3. Add composition guidelines to prompts
4. Update `src/lib/prompts.ts` with dynamic prompt generation

### Priority: High
- Directly impacts visual quality
- Leverages existing prompt infrastructure

---

## 3. Automatic Quality Assessment Framework
**Status: Not Done** ❌

### Current State
- No quality checks on generated images
- All images accepted regardless of quality
- No detection of common AI generation issues

### Proposed Improvements
- **Vision Model Evaluation**: Use GPT-4V or similar to evaluate images
- **Quality Rubric**: Score images on:
  - Text readability
  - Visual clarity/sharpness
  - Adherence to whiteboard style
  - Distortion detection (warped elements, melting)
  - Irrelevant element detection (random objects)
- **Threshold-based Filtering**: Reject images below quality threshold

### Implementation Steps
1. Create `src/lib/image-evaluator.ts`
2. Implement vision model evaluation function
3. Define quality rubric and scoring system
4. Add quality threshold configuration
5. Update pipeline to evaluate each image before storage

### Priority: High
- Prevents low-quality images from reaching users
- Addresses common AI generation issues

---

## 4. Iterative Optimization Loop
**Status: Not Done** ❌

### Current State
- Single-pass image generation
- No retry mechanism for failed images
- No prompt refinement

### Proposed Improvements
- **Retry Mechanism**: If image fails quality check, regenerate with refined prompt
- **Prompt Analysis**: Use LLM to analyze why image failed and generate improved prompt
- **Retry Limit**: Maximum 3 retries per slide to control costs
- **Fallback Strategy**: Use original prompt if all retries fail

### Implementation Steps
1. Add retry logic to pipeline image generation
2. Create prompt refinement function using LLM
3. Configure retry limits and fallback behavior
4. Track retry statistics for optimization

### Priority: Medium
- Improves success rate
- Adds cost (need to balance retry limit vs quality)

---

## 5. Learning from User Engagement
**Status: Not Done** ❌

### Current State
- No tracking of which slides users engage with
- No feedback system for prompt improvement
- No data-driven optimization

### Proposed Improvements
- **Engagement Tracking**: Track slide views, time spent, shares
- **A/B Testing**: Test different prompt variations
- **Success Metrics**: Identify patterns in successful prompts
- **Knowledge Base**: Build library of effective prompt patterns

### Implementation Steps
1. Add engagement tracking to database schema
2. Create analytics service to track metrics
3. Implement A/B testing framework for prompts
4. Build prompt pattern library
5. Add periodic retraining/optimization job

### Priority: Low
- Long-term improvement
- Requires data collection over time
- Significant engineering effort

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- Content pre-processing enhancement
- Dynamic prompt optimization
- Quality assessment framework (basic version)

### Phase 2: Optimization (Week 3-4)
- Iterative optimization loop
- Enhanced quality rubric
- Retry mechanism with prompt refinement

### Phase 3: Learning (Week 5-8)
- Engagement tracking infrastructure
- A/B testing framework
- Knowledge base creation
- Data-driven optimization

---

## Cost Considerations

### Additional Costs
- **Content Pre-processing**: ~$0.002 per article (GPT-4.1)
- **Quality Assessment**: ~$0.01 per image (GPT-4V)
- **Prompt Refinement**: ~$0.01 per retry (GPT-4.1)
- **Total Additional**: ~$0.12-0.20 per deck (10-15 slides × retries)

### Mitigation Strategies
- Cache pre-processed content
- Only evaluate images that seem problematic
- Limit retry attempts
- Use cheaper models for initial quality checks

### Expected ROI
- Higher quality images → better user retention
- Reduced manual curation needs
- Competitive advantage in visual quality

---

## Technical Considerations

### Database Schema Changes
- Add engagement tracking tables (SlideEngagement, DeckEngagement)
- Add prompt versions to Slide model
- Add quality scores to Slide model

### New Services
- `src/lib/content-preprocessor.ts`
- `src/lib/image-evaluator.ts`
- `src/lib/prompt-optimizer.ts`
- `src/lib/analytics.ts`

### API Changes
- Add engagement tracking endpoints
- Add quality metrics endpoints
- Add A/B testing endpoints

### Monitoring
- Track quality assessment success rate
- Monitor retry statistics
- Track user engagement metrics
- Alert on quality degradation

---

## Success Metrics

- **Quality Score**: Target 85%+ images passing quality rubric
- **User Engagement**: Increase avg slide view time by 20%
- **Success Rate**: Reduce generation failures by 50%
- **Cost Efficiency**: Keep additional costs under $0.25/deck

---

## Open Questions

1. Should quality assessment be synchronous or asynchronous?
2. What retry limit balances cost vs quality?
3. How long to collect engagement data before optimization?
4. Should we allow manual quality overrides?
5. How to handle articles that consistently fail quality checks?

---

## Next Steps

1. Review and approve this plan
2. Prioritize improvements based on business goals
3. Define success metrics and monitoring
4. Begin Phase 1 implementation

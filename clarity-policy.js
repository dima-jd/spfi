export const clarityProjectId = 'ymfx2g1k8j';
export const clarityEvents = new Set(['map_open','project_open','source_view','correction_submit','contribution_submit']);
const domains = new Set(['agripv','research','industry','people','environment','storage','projects','plans','candidates','industrial','public','site']);
const types = new Set(['article','map','project','page']);
export function safeClarityMessage(input = {}) {
  const tags = {};
  if (['en','he'].includes(input.tags?.language)) tags.language = input.tags.language;
  if (domains.has(input.tags?.domain)) tags.domain = input.tags.domain;
  if (types.has(input.tags?.content_type)) tags.content_type = input.tags.content_type;
  return {type:'spfi-clarity', tags, ...(clarityEvents.has(input.event) ? {event:input.event} : {})};
}

export function aggregateCreatorMemory(profile: any, pastGenerations: any[] = []): string {
  if (!profile || profile.memory_enabled === false) {
    return 'Creator memory is disabled.';
  }

  const memoryParts: string[] = [];

  memoryParts.push(`Creator Niche: ${profile.niche} (${profile.sub_niche || 'General'}).`);
  memoryParts.push(`Target Audience: ${profile.target_audience}.`);
  memoryParts.push(`Preferred Tone: ${Array.isArray(profile.tone) ? profile.tone.join(', ') : profile.tone}.`);
  memoryParts.push(`Experience Level: ${profile.experience_level || 'Intermediate'}.`);

  if (pastGenerations.length >= 3) {
    const savedCount = pastGenerations.filter((g) => g.is_saved).length;
    memoryParts.push(`Past Activity: ${pastGenerations.length} packages created, ${savedCount} saved.`);
  }

  return memoryParts.join(' ');
}

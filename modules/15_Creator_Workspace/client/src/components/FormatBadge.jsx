import React from 'react';
import { Video, Layers, FileText, Smartphone } from 'lucide-react';

export default function FormatBadge({ format }) {
  const norm = (format || '').toLowerCase();

  if (norm.includes('reel')) {
    return (
      <span className="format-badge badge-reel">
        <Video size={13} />
        <span>Reel</span>
      </span>
    );
  }

  if (norm.includes('carousel')) {
    return (
      <span className="format-badge badge-carousel">
        <Layers size={13} />
        <span>Carousel</span>
      </span>
    );
  }

  if (norm.includes('story')) {
    return (
      <span className="format-badge badge-story">
        <Smartphone size={13} />
        <span>Story</span>
      </span>
    );
  }

  return (
    <span className="format-badge badge-caption">
      <FileText size={13} />
      <span>Caption</span>
    </span>
  );
}

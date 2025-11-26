'use client';

import { TEMPLATES, BookTemplate } from '@/lib/publish/templates';
import { Check } from 'lucide-react';

interface TemplateSelectorProps {
  selectedTemplateId: string;
  onSelect: (template: BookTemplate) => void;
}

export function TemplateSelector({ selectedTemplateId, onSelect }: TemplateSelectorProps) {
  return (
    <div className="space-y-2">
      {TEMPLATES.map((template) => (
        <button
          key={template.id}
          onClick={() => onSelect(template)}
          className={`
            relative w-full p-2 rounded-lg border-2 text-left transition-all flex items-center gap-3
            ${selectedTemplateId === template.id 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50 hover:bg-muted/50'
            }
          `}
        >
          <div 
            className="w-12 h-16 rounded border overflow-hidden flex-shrink-0"
            style={{ backgroundColor: template.styles.pageBackground }}
          >
            <div className="p-1 h-full flex flex-col">
              <div 
                className="text-center mb-0.5 font-bold"
                style={{
                  fontFamily: template.styles.chapterTitleFont,
                  fontSize: '5px',
                  color: template.styles.chapterTitleColor,
                }}
              >
                Title
              </div>
              <div 
                className="mb-0.5"
                style={{
                  fontFamily: template.styles.sectionTitleFont,
                  fontSize: '4px',
                  color: template.styles.sectionTitleColor,
                  borderLeft: `1px solid ${template.styles.accentColor}`,
                  paddingLeft: '2px',
                }}
              >
                Section
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="h-0.5 bg-gray-300 rounded w-full" />
                <div className="h-0.5 bg-gray-300 rounded w-11/12" />
                <div className="h-0.5 bg-gray-300 rounded w-10/12" />
              </div>
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm flex items-center gap-2">
              {template.name}
              {selectedTemplateId === template.id && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </div>
            <div className="text-xs text-muted-foreground line-clamp-1">
              {template.description}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

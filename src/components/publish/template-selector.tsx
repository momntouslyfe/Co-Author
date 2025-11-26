'use client';

import { TEMPLATES, BookTemplate } from '@/lib/publish/templates';
import { Check } from 'lucide-react';

interface TemplateSelectorProps {
  selectedTemplateId: string;
  onSelect: (template: BookTemplate) => void;
}

export function TemplateSelector({ selectedTemplateId, onSelect }: TemplateSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {TEMPLATES.map((template) => (
        <button
          key={template.id}
          onClick={() => onSelect(template)}
          className={`
            relative p-3 rounded-lg border-2 text-left transition-all
            ${selectedTemplateId === template.id 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50 hover:bg-muted/50'
            }
          `}
        >
          {selectedTemplateId === template.id && (
            <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
              <Check className="w-3 h-3 text-primary-foreground" />
            </div>
          )}
          
          <div 
            className="w-full aspect-[8.5/11] mb-2 rounded border overflow-hidden"
            style={{ backgroundColor: template.styles.pageBackground }}
          >
            <div className="p-2 h-full flex flex-col">
              <div 
                className="text-center mb-1 font-bold"
                style={{
                  fontFamily: template.styles.chapterTitleFont,
                  fontSize: '8px',
                  color: template.styles.chapterTitleColor,
                }}
              >
                Chapter Title
              </div>
              <div 
                className="border-b mb-1 pb-1"
                style={{
                  fontFamily: template.styles.sectionTitleFont,
                  fontSize: '6px',
                  color: template.styles.sectionTitleColor,
                  borderColor: template.styles.accentColor + '40',
                }}
              >
                Section
              </div>
              <div 
                className="flex-1 space-y-0.5"
                style={{
                  fontFamily: template.styles.bodyFont,
                  fontSize: '4px',
                  color: template.styles.bodyColor,
                  lineHeight: '1.3',
                }}
              >
                <div className="h-1 bg-current opacity-20 rounded w-full" />
                <div className="h-1 bg-current opacity-20 rounded w-11/12" />
                <div className="h-1 bg-current opacity-20 rounded w-10/12" />
                <div className="h-1 bg-current opacity-20 rounded w-full" />
                <div className="h-1 bg-current opacity-20 rounded w-9/12" />
              </div>
            </div>
          </div>
          
          <div className="font-medium text-sm">{template.name}</div>
          <div className="text-xs text-muted-foreground line-clamp-2">
            {template.description}
          </div>
        </button>
      ))}
    </div>
  );
}

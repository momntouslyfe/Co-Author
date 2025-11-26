'use client';

import { EditorStyles, fontOptions, defaultStyles } from '@/lib/publish/content-transformer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Type, Palette, FileText } from 'lucide-react';

type StylePanelProps = {
  styles: EditorStyles;
  onStyleChange: (styles: EditorStyles) => void;
};

export function StylePanel({ styles, onStyleChange }: StylePanelProps) {
  const updateStyle = <K extends keyof EditorStyles>(key: K, value: EditorStyles[K]) => {
    onStyleChange({ ...styles, [key]: value });
  };

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Style Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Accordion type="multiple" defaultValue={['chapter', 'subtopic', 'body', 'header-footer']} className="w-full">
          <AccordionItem value="chapter" className="border-x-0">
            <AccordionTrigger className="px-4 py-3 text-sm font-medium">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                Chapter Titles
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Font Family</Label>
                <Select
                  value={styles.chapterTitleFont}
                  onValueChange={(v) => updateStyle('chapterTitleFont', v)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontOptions.map((font) => (
                      <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Font Size: {styles.chapterTitleSize}pt</Label>
                <Slider
                  value={[styles.chapterTitleSize]}
                  onValueChange={([v]) => updateStyle('chapterTitleSize', v)}
                  min={16}
                  max={48}
                  step={1}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={styles.chapterTitleColor}
                    onChange={(e) => updateStyle('chapterTitleColor', e.target.value)}
                    className="w-12 h-8 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={styles.chapterTitleColor}
                    onChange={(e) => updateStyle('chapterTitleColor', e.target.value)}
                    className="flex-1 h-8"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="subtopic" className="border-x-0">
            <AccordionTrigger className="px-4 py-3 text-sm font-medium">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                Subtopics
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Font Family</Label>
                <Select
                  value={styles.subtopicFont}
                  onValueChange={(v) => updateStyle('subtopicFont', v)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontOptions.map((font) => (
                      <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Font Size: {styles.subtopicSize}pt</Label>
                <Slider
                  value={[styles.subtopicSize]}
                  onValueChange={([v]) => updateStyle('subtopicSize', v)}
                  min={12}
                  max={32}
                  step={1}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={styles.subtopicColor}
                    onChange={(e) => updateStyle('subtopicColor', e.target.value)}
                    className="w-12 h-8 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={styles.subtopicColor}
                    onChange={(e) => updateStyle('subtopicColor', e.target.value)}
                    className="flex-1 h-8"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="body" className="border-x-0">
            <AccordionTrigger className="px-4 py-3 text-sm font-medium">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Body Text
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Font Family</Label>
                <Select
                  value={styles.bodyFont}
                  onValueChange={(v) => updateStyle('bodyFont', v)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontOptions.map((font) => (
                      <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Font Size: {styles.bodySize}pt</Label>
                <Slider
                  value={[styles.bodySize]}
                  onValueChange={([v]) => updateStyle('bodySize', v)}
                  min={8}
                  max={24}
                  step={1}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={styles.bodyColor}
                    onChange={(e) => updateStyle('bodyColor', e.target.value)}
                    className="w-12 h-8 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={styles.bodyColor}
                    onChange={(e) => updateStyle('bodyColor', e.target.value)}
                    className="flex-1 h-8"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="header-footer" className="border-x-0 border-b-0">
            <AccordionTrigger className="px-4 py-3 text-sm font-medium">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                Header & Footer
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Header</Label>
                <Select
                  value={styles.headerFont}
                  onValueChange={(v) => updateStyle('headerFont', v)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontOptions.map((font) => (
                      <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Slider
                  value={[styles.headerSize]}
                  onValueChange={([v]) => updateStyle('headerSize', v)}
                  min={8}
                  max={16}
                  step={1}
                />
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={styles.headerColor}
                    onChange={(e) => updateStyle('headerColor', e.target.value)}
                    className="w-12 h-8 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={styles.headerColor}
                    onChange={(e) => updateStyle('headerColor', e.target.value)}
                    className="flex-1 h-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Footer</Label>
                <Select
                  value={styles.footerFont}
                  onValueChange={(v) => updateStyle('footerFont', v)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontOptions.map((font) => (
                      <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Slider
                  value={[styles.footerSize]}
                  onValueChange={([v]) => updateStyle('footerSize', v)}
                  min={8}
                  max={16}
                  step={1}
                />
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={styles.footerColor}
                    onChange={(e) => updateStyle('footerColor', e.target.value)}
                    className="w-12 h-8 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={styles.footerColor}
                    onChange={(e) => updateStyle('footerColor', e.target.value)}
                    className="flex-1 h-8"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

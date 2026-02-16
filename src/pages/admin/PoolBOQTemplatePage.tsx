import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Waves,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  getDefaultPoolBOQTemplate,
  getDefaultPoolBOQOptionsTemplate,
  PoolBOQTemplateCategory,
  PoolBOQTemplateSubcategory,
  PoolBOQTemplateLine
} from '@/lib/pool-formulas';

/**
 * Pool BOQ Template Editor Page
 * 
 * This page allows administrators to view and understand the pool BOQ template structure.
 * The template defines all categories, subcategories, and lines that are created when
 * generating a BOQ for a pool model.
 * 
 * NOTE: Currently the template is read-only from pool-formulas.ts
 * Future enhancement: Store template in database for full editability
 */

const PoolBOQTemplatePage: React.FC = () => {
  const { toast } = useToast();
  
  // Load templates
  const [baseTemplate, setBaseTemplate] = useState<PoolBOQTemplateCategory[]>([]);
  const [optionsTemplate, setOptionsTemplate] = useState<PoolBOQTemplateCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<number[]>([]);
  const [expandedSubcategories, setExpandedSubcategories] = useState<string[]>([]);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    try {
      const base = getDefaultPoolBOQTemplate();
      const options = getDefaultPoolBOQOptionsTemplate();
      setBaseTemplate(base);
      setOptionsTemplate(options);
      toast({
        title: 'Modèle chargé',
        description: `${base.length} catégories de base, ${options.length} catégories d'options`,
      });
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const toggleCategory = (index: number) => {
    if (expandedCategories.includes(index)) {
      setExpandedCategories(prev => prev.filter(i => i !== index));
    } else {
      setExpandedCategories(prev => [...prev, index]);
    }
  };

  const toggleSubcategory = (key: string) => {
    if (expandedSubcategories.includes(key)) {
      setExpandedSubcategories(prev => prev.filter(k => k !== key));
    } else {
      setExpandedSubcategories(prev => [...prev, key]);
    }
  };

  const renderLine = (line: PoolBOQTemplateLine, index: number) => {
    return (
      <div key={index} className="border-l-2 border-gray-300 pl-4 py-2 text-sm">
        <div className="flex items-start gap-2">
          <span className="font-mono text-xs text-gray-500 min-w-[30px]">{index + 1}.</span>
          <div className="flex-1">
            <div className="font-medium text-gray-800">{line.description}</div>
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-600">
              <span className="bg-blue-50 px-2 py-1 rounded">
                <strong>Quantité:</strong> {line.quantity_formula || line.quantity}
              </span>
              <span className="bg-green-50 px-2 py-1 rounded">
                <strong>Unité:</strong> {line.unit}
              </span>
              <span className="bg-purple-50 px-2 py-1 rounded">
                <strong>Prix:</strong> {line.price_list_name}
              </span>
            </div>
            {line.quantity_formula && (
              <div className="mt-1 font-mono text-xs text-blue-600">
                Formule: <code className="bg-blue-50 px-1 py-0.5 rounded">{line.quantity_formula}</code>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSubcategory = (subcat: PoolBOQTemplateSubcategory, catIndex: number, subcatIndex: number) => {
    const key = `${catIndex}-${subcatIndex}`;
    const isExpanded = expandedSubcategories.includes(key);

    return (
      <div key={subcatIndex} className="border rounded-lg p-3 bg-gray-50">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSubcategory(key)}
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
            <h4 className="font-semibold text-gray-700">{subcat.name}</h4>
            <Badge variant="outline" className="text-xs">
              {subcat.lines.length} lignes
            </Badge>
          </div>
          <span className="text-xs text-gray-500">Ordre: {subcat.display_order}</span>
        </div>

        {isExpanded && (
          <div className="mt-3 space-y-1">
            {subcat.lines.map((line, idx) => renderLine(line, idx))}
          </div>
        )}
      </div>
    );
  };

  const renderCategory = (category: PoolBOQTemplateCategory, index: number) => {
    const isExpanded = expandedCategories.includes(index);
    const totalLines = category.subcategories.reduce((sum, sub) => sum + sub.lines.length, 0);

    return (
      <Card key={index} className={category.is_option ? 'border-orange-300' : ''}>
        <CardHeader
          className="cursor-pointer hover:bg-gray-50"
          onClick={() => toggleCategory(index)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-500" />
              )}
              <div>
                <CardTitle className="text-lg">{category.name}</CardTitle>
                <div className="flex gap-2 mt-1">
                  {category.is_option && (
                    <Badge variant="secondary">Option</Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {category.subcategories.length} sous-catégories
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {totalLines} lignes
                  </Badge>
                </div>
              </div>
            </div>
            <span className="text-sm text-gray-500">Ordre: {category.display_order}</span>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent>
            <div className="space-y-3">
              {category.subcategories.map((subcat, idx) => 
                renderSubcategory(subcat, index, idx)
              )}
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  const totalBaseCategories = baseTemplate.length;
  const totalBaseSubcategories = baseTemplate.reduce((sum, cat) => sum + cat.subcategories.length, 0);
  const totalBaseLines = baseTemplate.reduce((sum, cat) => 
    sum + cat.subcategories.reduce((s, sub) => s + sub.lines.length, 0), 0
  );

  const totalOptionCategories = optionsTemplate.length;
  const totalOptionSubcategories = optionsTemplate.reduce((sum, cat) => sum + cat.subcategories.length, 0);
  const totalOptionLines = optionsTemplate.reduce((sum, cat) => 
    sum + cat.subcategories.reduce((s, sub) => s + sub.lines.length, 0), 0
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <Waves className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Modèle BOQ Piscine</h1>
            <p className="text-gray-600">
              Structure du modèle par défaut utilisé lors de la génération d'un BOQ piscine
            </p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">À propos de ce modèle</p>
              <p>
                Ce modèle définit la structure complète d'un BOQ piscine : catégories, sous-catégories, 
                et lignes avec leurs formules de calcul. Actuellement, ce modèle est défini dans le code 
                source (pool-formulas.ts) et est en <strong>lecture seule</strong>.
              </p>
              <p className="mt-2">
                Pour personnaliser le modèle : modifiez le fichier <code className="bg-blue-100 px-1 rounded">src/lib/pool-formulas.ts</code>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Catégories de Base
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{totalBaseCategories}</div>
                <div className="text-xs text-gray-600">Catégories</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{totalBaseSubcategories}</div>
                <div className="text-xs text-gray-600">Sous-catégories</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{totalBaseLines}</div>
                <div className="text-xs text-gray-600">Lignes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Catégories Options
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-orange-600">{totalOptionCategories}</div>
                <div className="text-xs text-gray-600">Catégories</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{totalOptionSubcategories}</div>
                <div className="text-xs text-gray-600">Sous-catégories</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{totalOptionLines}</div>
                <div className="text-xs text-gray-600">Lignes</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Base Categories */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Catégories de Base</h2>
        <div className="space-y-4">
          {baseTemplate.map((category, index) => renderCategory(category, index))}
        </div>
      </div>

      {/* Option Categories */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Catégories Options</h2>
        <div className="space-y-4">
          {optionsTemplate.map((category, index) => 
            renderCategory(category, baseTemplate.length + index)
          )}
        </div>
      </div>
    </div>
  );
};

export default PoolBOQTemplatePage;

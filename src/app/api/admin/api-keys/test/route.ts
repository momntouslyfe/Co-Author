import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import type { AIProvider } from '@/lib/definitions';

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

async function testAPIKey(provider: AIProvider, apiKey: string, model?: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (provider === 'claude') {
      return {
        success: false,
        error: 'Claude integration not yet implemented'
      };
    }

    // Test using provider-specific SDK directly for lightweight validation
    if (provider === 'gemini') {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Normalize model name - remove 'googleai/' prefix and any suffixes like ':thinking'
      let modelName = model || 'googleai/gemini-2.5-flash';
      if (modelName.startsWith('googleai/')) {
        modelName = modelName.substring(9);
      }
      // Remove any suffixes after colon (e.g., ':thinking')
      if (modelName.includes(':')) {
        modelName = modelName.split(':')[0];
      }
      
      const testModel = genAI.getGenerativeModel({ model: modelName });
      
      // Minimal test request with low token count
      const result = await testModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
        generationConfig: { maxOutputTokens: 5 }
      });
      
      // Check if we got a response (success includes safety blocks)
      if (result.response) {
        // Check for safety blocks in promptFeedback
        const feedback = result.response.promptFeedback;
        if (feedback?.blockReason || (feedback as any)?.blocked) {
          // Safety block - but API key is valid
          return { success: true };
        }
        
        try {
          result.response.text();
          return { success: true };
        } catch (error: any) {
          // Safety block in response - but API key is valid
          if (error.message?.includes('safety') || error.message?.includes('blocked')) {
            return { success: true };
          }
          throw error;
        }
      }
    } else if (provider === 'openai') {
      const { OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey });
      
      // Normalize model name - remove 'openai/' prefix and any suffixes
      let modelName = model || 'openai/gpt-4o';
      if (modelName.startsWith('openai/')) {
        modelName = modelName.substring(7);
      }
      // Remove any suffixes after colon
      if (modelName.includes(':')) {
        modelName = modelName.split(':')[0];
      }
      
      // Minimal test request with low token count
      const completion = await openai.chat.completions.create({
        model: modelName,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      });
      
      // Any response means the API key is valid
      if (completion.choices && completion.choices.length > 0) {
        return { success: true };
      }
    }
    
    return {
      success: false,
      error: 'No response received from AI provider'
    };
  } catch (error: any) {
    console.error('API key test error:', error);
    
    // Extract useful error message
    let errorMessage = 'Failed to connect to AI provider';
    
    if (error.message) {
      if (error.message.includes('API key') || error.message.includes('401') || error.message.includes('authentication')) {
        errorMessage = 'Invalid API key';
      } else if (error.message.includes('quota') || error.message.includes('429')) {
        errorMessage = 'API quota exceeded or rate limited';
      } else if (error.message.includes('permission') || error.message.includes('403')) {
        errorMessage = 'Permission denied - check API key permissions';
      } else if (error.message.includes('model') || error.message.includes('404')) {
        errorMessage = 'Invalid model name or model not accessible';
      } else if (error.status === 401) {
        errorMessage = 'Invalid API key';
      } else if (error.status === 429) {
        errorMessage = 'API quota exceeded or rate limited';
      } else {
        errorMessage = error.message;
      }
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getAuthToken(request);
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { valid } = verifyAdminToken(token);
    
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    const { provider, apiKey, model } = await request.json();
    
    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: 'Provider and API key are required' },
        { status: 400 }
      );
    }
    
    const result = await testAPIKey(provider as AIProvider, apiKey, model);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Successfully connected to ${provider}`
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Test API key error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    );
  }
}

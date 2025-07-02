'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestTikoPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testTikoEdgeFunction = async () => {
    setLoading(true)
    setResult(null)

    const testPaymentData = {
      orderData: {
        orderId: 'TEST_' + Date.now(),
        amount: 100.00,
        currency: 'TRY',
        installment: 0
      },
      cardData: {
        cardName: 'TEST USER',
        cardNo: '4109104545898068', // Test Visa card from TIKO docs
        cardCvv: '001',
        cardExpireMonth: '01',
        cardExpireYear: '29',
        cardType: ''
      },
      userInfo: {
        userIp: '127.0.0.1',
        userName: 'Test User',
        userEmail: 'test@test.com',
        userPhone: '+905551234567',
        userAddress: ''
      },
      urls: {
        urlOk: `${window.location.origin}/test-success`,
        urlFail: `${window.location.origin}/test-fail`
      },
      description: 'Test Payment'
    }

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uxwzfghgqldhkkzsrlfu.supabase.co'
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4d3pmZ2hncWxkaGtrenNybGZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU3ODE2MTgsImV4cCI6MjA2MTM1NzYxOH0.xAEZEE7zBqjcSDzREFFty5hHYSKLMVNRDTaFsHjTU9I'
      
      console.log('Calling Edge Function with test data:', testPaymentData)
      
      const response = await fetch(`${supabaseUrl}/functions/v1/payment-process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPaymentData)
      })

      console.log('Edge Function response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Edge Function error:', errorText)
        setResult({ error: `HTTP ${response.status}: ${errorText}` })
        return
      }

      const paymentResult = await response.json()
      console.log('Edge Function result:', paymentResult)
      setResult(paymentResult)
      
    } catch (error) {
      console.error('Test error:', error)
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>TIKO Edge Function Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={testTikoEdgeFunction} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Testing...' : 'Test TIKO Edge Function'}
          </Button>
          
          {result && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Result:</h3>
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-auto text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>
              
              {result.success && result.tikoUrl && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-green-800 dark:text-green-200 font-semibold">✅ Edge Function Success!</p>
                  <p className="text-sm mt-1">
                    <strong>TIKO URL:</strong> {result.tikoUrl}
                  </p>
                  <p className="text-sm">
                    <strong>Form Fields:</strong> {Object.keys(result.formData || {}).length} fields
                  </p>
                  <p className="text-sm">
                    <strong>Is Sandbox:</strong> {result.tikoUrl.includes('sandbox') ? 'Yes' : 'No'}
                  </p>
                </div>
              )}
              
              {result.error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-red-800 dark:text-red-200 font-semibold">❌ Error</p>
                  <p className="text-sm mt-1">{result.error}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 
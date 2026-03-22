import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function migrate() {
  console.log('🚀 Starting migration...')

  // 1. Read JSON
  const rawData = fs.readFileSync('./src/Data/t1.json', 'utf8')
  const data = JSON.parse(rawData)
  const questionsList = Array.isArray(data) ? data : (data.questions || [])

  if (questionsList.length === 0) {
    console.error('❌ No questions found in JSON.')
    return
  }

  // 2. Use the hardcoded Test ID from schema (Mathematics Assessment 1)
  const testId = '00000000-0000-0000-0000-000000000001'

  console.log(`📦 Migrating ${questionsList.length} questions to Test ID: ${testId}`)

  // 3. Transform and Insert
  const formattedQuestions = questionsList.map(q => ({
    test_id: testId,
    question_text: q.question || q.text || 'Question',
    options: q.options || [],
    correct_answer: q.answer || q.correctAnswer || '',
    explanation: q.explanation || ''
  }))

  const { error } = await supabase
    .from('questions')
    .insert(formattedQuestions)

  if (error) {
    console.error('❌ Migration failed:', error.message)
  } else {
    console.log('✅ Migration successful! All questions are now in Supabase.')
  }
}

migrate()

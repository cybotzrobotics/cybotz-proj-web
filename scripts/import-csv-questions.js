#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

// CSV to Database column mapping
const COLUMN_MAPPING = {
  // CSV column -> Database column
  'question': 'question',
  'options': 'options',
  'correct_answer': 'correct_answer',
  'explanation': 'explanation',
  'category': 'category',
  'difficulty': 'difficulty',
  'section': 'section',
  'rule_name': 'rule_name',
  'tags': 'tags',
  'source_page': 'source_page',
  'confidence': 'confidence',
  'season': 'season',
  
  // Map CSV columns to new columns
  'question_type': 'question_type',
  'confidence_score': 'confidence_score',
  'requires_review': 'requires_review',
  'updated_at': 'updated_at',
  'last_verified': 'last_verified',
  'times_used': 'times_used',
  'times_correct': 'times_correct'
};

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function convertCSVToQuestions(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = parseCSVLine(lines[0]);
  const questions = [];
  
  console.log('📋 CSV Headers found:', headers);
  console.log('📊 Total rows to process:', lines.length - 1);
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < headers.length) continue;
    
    const question = {};
    
    // Map CSV data to database columns
    headers.forEach((header, index) => {
      const dbColumn = COLUMN_MAPPING[header.toLowerCase().trim()];
      if (dbColumn && values[index]) {
        let value = values[index].replace(/^"|"$/g, ''); // Remove quotes
        
        // Handle special data types
        if (dbColumn === 'options' && typeof value === 'string') {
          try {
            question[dbColumn] = JSON.parse(value);
          } catch {
            // If not JSON, assume it's a comma-separated string
            question[dbColumn] = value.split(',').map(opt => opt.trim());
          }
        } else if (dbColumn === 'tags' && typeof value === 'string') {
          try {
            question[dbColumn] = JSON.parse(value);
          } catch {
            question[dbColumn] = value.split(',').map(tag => tag.trim());
          }
        } else if (dbColumn === 'correct_answer') {
          question[dbColumn] = parseInt(value) || 0;
        } else if (dbColumn === 'confidence' || dbColumn === 'confidence_score') {
          question[dbColumn] = parseInt(value) || 80;
        } else if (dbColumn === 'times_used' || dbColumn === 'times_correct') {
          question[dbColumn] = parseInt(value) || 0;
        } else if (dbColumn === 'requires_review') {
          question[dbColumn] = value.toLowerCase() === 'true' || value === '1';
        } else {
          question[dbColumn] = value;
        }
      }
    });
    
    // Set defaults for required fields
    question.season = question.season || '2025-2026';
    question.difficulty = question.difficulty || 'medium';
    question.confidence = question.confidence || 80;
    
    questions.push(question);
  }
  
  return questions;
}

async function importCSVQuestions(csvFilePath) {
  console.log('📁 Reading CSV file:', csvFilePath);
  
  if (!fs.existsSync(csvFilePath)) {
    console.error('❌ CSV file not found:', csvFilePath);
    return;
  }
  
  const csvContent = fs.readFileSync(csvFilePath, 'utf8');
  const questions = convertCSVToQuestions(csvContent);
  
  console.log('✅ Converted', questions.length, 'questions from CSV');
  
  if (questions.length === 0) {
    console.error('❌ No questions to import');
    return;
  }
  
  // Show sample question
  console.log('📝 Sample question:', JSON.stringify(questions[0], null, 2));
  
  // Import in batches
  const batchSize = 50;
  let imported = 0;
  
  for (let i = 0; i < questions.length; i += batchSize) {
    const batch = questions.slice(i, i + batchSize);
    
    console.log(`📤 Importing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(questions.length/batchSize)} (${batch.length} questions)...`);
    
    const { data, error } = await supabase
      .from('quiz_questions')
      .insert(batch)
      .select('id');
    
    if (error) {
      console.error('❌ Error importing batch:', error);
      console.error('📋 Failed batch sample:', batch[0]);
    } else {
      imported += data.length;
      console.log(`✅ Successfully imported ${data.length} questions (Total: ${imported})`);
    }
  }
  
  console.log('🎉 Import complete!', imported, 'questions imported successfully');
}

// Main execution
if (require.main === module) {
  const csvFile = process.argv[2];
  
  if (!csvFile) {
    console.log('📖 Usage: node scripts/import-csv-questions.js <path-to-csv-file>');
    console.log('📝 Example: node scripts/import-csv-questions.js ./questions.csv');
    process.exit(1);
  }
  
  importCSVQuestions(csvFile);
}

module.exports = { importCSVQuestions, convertCSVToQuestions };
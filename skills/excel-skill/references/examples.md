# Excel Skill — Examples

## Scenario 1: User uploads a file and asks a question
```
User: "How many rows are in sales.xlsx and what columns does it have?"

Agent:
1. python scripts/excel.py info --file sales.xlsx
   → {"sheets":[{"name":"Sheet1","rows":120,"cols":5,"columns":["id","name","amount","date","region"]}]}
2. Answer from the JSON.
```

## Scenario 2: Read specific range
```
User: "Show me A1:C5 of Sheet2 in report.xlsx"

Agent: python scripts/excel.py read --file report.xlsx --sheet Sheet2 --range A1:C5 --output table
```

## Scenario 3: Create a new Excel from data
```
User: "Save these results to output.xlsx"

Agent: python scripts/excel.py write --file output.xlsx --sheet Results \
  --data '[{"task":"A","status":"done"},{"task":"B","status":"pending"}]'
```

## Scenario 4: Append a row
```
User: "Add Tom's score of 92 to results.xlsx"

Agent: python scripts/excel.py append --file results.xlsx --sheet Sheet1 \
  --data '[{"name":"Tom","score":92}]'
```

## Scenario 5: Update a cell
```
User: "Change B2 in budget.xlsx to 5000"

Agent: python scripts/excel.py update --file budget.xlsx --sheet Sheet1 --cells '{"B2":5000}'
```

## Scenario 6: Convert
```
User: "Turn data.xlsx into a CSV"

Agent: python scripts/excel.py convert --file data.xlsx --to csv --out data.csv
```

## Scenario 7: Large file, avoid flooding context
```
Agent: python scripts/excel.py read --file huge.xlsx --output json --out-file /tmp/huge.json
   → {"saved":"/tmp/huge.json","rows":50000,"cols":12}
Then read only the part needed with jq or python.
```
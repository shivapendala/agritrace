import os

with open('frontend/src/mockData.ts', 'w') as f:
    f.write('export const largeMockData = [\n')
    lines = []
    for i in range(50000):
        lines.append(f'  {{ id: {i}, name: "Mock Item {i}", description: "This is a mock description for item {i}", isActive: true, createdAt: "2023-01-01T00:00:00Z", type: "test_type", tags: ["mock", "test", "data"], value: {i * 100} }}')
    f.write(',\n'.join(lines))
    f.write('\n];\n')

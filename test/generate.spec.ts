import get from 'lodash/get';
import keys from 'lodash/keys';
import { OpenAPIV3 } from 'openapi-types';
import { beforeAll, describe, it, expect } from 'vitest';

import { getV3Doc } from '../src/swagger';
import { generateOperationCollection } from '../src/generate';

const generateCollectionFromSpec = async (spec: string) => {
  const apiDoc = await getV3Doc(spec);
  return generateOperationCollection(apiDoc, { output: '' });
};

describe('generate:generateOperationCollection', () => {
  let schema: OpenAPIV3.SchemaObject;
  beforeAll(async () => {
    const collection = await generateCollectionFromSpec('./test/fixture/test.yaml');
    schema = get(collection, [0, 'response', '0', 'responses', 'application/json; ; charset=utf-8;', 'allOf', 1]);
  });

  it('schema should be defined', () => {
    expect(schema).toBeDefined();
  });

  it('should resolve ref under allOf', async () => {
    const testEntity = get(schema, ['properties', 'data', 'properties', 'rows', 'items', 'allOf', 0]);
    expect(testEntity).toBeDefined();
    expect(testEntity.description).equal('TestEntity');
  });

  it("should resolve ref's allOf after it's resolving", async () => {
    const baseEntity = get(schema, [
      'properties',
      'data',
      'properties',
      'rows',
      'items',
      'allOf',
      0,
      'allOf',
      0,
      'allOf',
      0,
    ]);
    expect(baseEntity).toMatchObject({ type: 'object' });
    expect(baseEntity).not.haveOwnProperty('$ref');
  });

  it('should not resolve circular ref', async () => {
    const creatorBaseEntity = get(schema, [
      'properties',
      'data',
      'properties',
      'rows',
      'items',
      'allOf',
      0,
      'allOf',
      0,
      'allOf',
      0,
      'properties',
      'creator',
      'allOf',
      0,
    ]);
    expect(keys(creatorBaseEntity).length).toEqual(0);
  });

  it('should resolve type object allOf recursively', async () => {
    const collection = await generateCollectionFromSpec('./test/fixture/test.yaml');
    const arrayEntity = get(collection, [
      1,
      'response',
      0,
      'responses',
      'application/json',
      'properties',
      'data',
      'items',
      'allOf',
      0,
    ]);
    expect(arrayEntity).toMatchObject({ type: 'object' });
  });
});

describe('generate:OpenAPI 3.0.4 Support', () => {
  it('should parse OpenAPI 3.0.4 spec successfully', async () => {
    const apiDoc = await getV3Doc('./test/fixture/openapi-3.0.4.yaml');
    expect(apiDoc).toBeDefined();
    expect(apiDoc.openapi).toBe('3.0.4');
    expect(apiDoc.info.title).toBe('OpenAPI 3.0.4 Test API');
  });

  it('should generate operations from OpenAPI 3.0.4 spec', async () => {
    const collection = await generateCollectionFromSpec('./test/fixture/openapi-3.0.4.yaml');
    expect(collection).toBeDefined();
    expect(collection.length).toBeGreaterThan(0);
    
    // Check that operations are generated correctly
    const getUsersOperation = collection.find(op => op.verb === 'get' && op.path === '/users');
    expect(getUsersOperation).toBeDefined();
    expect(getUsersOperation?.verb).toBe('get');
    expect(getUsersOperation?.path).toBe('/users');
  });

  it('should handle 3.0.4 spec with complex schemas', async () => {
    const collection = await generateCollectionFromSpec('./test/fixture/openapi-3.0.4.yaml');
    const createUserOperation = collection.find(op => op.verb === 'post' && op.path === '/users');
    
    expect(createUserOperation).toBeDefined();
    expect(createUserOperation?.verb).toBe('post');
    
    // Check response schemas are resolved
    const successResponse = createUserOperation?.response?.find(r => r.code === '201')?.responses?.['application/json'];
    expect(successResponse).toBeDefined();
    expect(successResponse?.properties?.id).toBeDefined();
    expect(successResponse?.properties?.email).toBeDefined();
  });

  it('should handle path parameters in 3.0.4 spec', async () => {
    const collection = await generateCollectionFromSpec('./test/fixture/openapi-3.0.4.yaml');
    const getUserOperation = collection.find(op => op.verb === 'get' && op.path === '/users/:userId');
    
    expect(getUserOperation).toBeDefined();
    expect(getUserOperation?.path).toBe('/users/:userId');
    expect(getUserOperation?.response).toBeDefined();
    expect(getUserOperation?.response.length).toBeGreaterThan(0);
  });
});

import { PredictiveModelRepository } from '../../../PredictiveModel/Application';
import { ProductCatalog } from '../../Domain';
import { ProductRepository } from '../Repositories/ProductRepository';

export async function loadTrainedCatalog(
  productRepository: ProductRepository,
  modelRepository: PredictiveModelRepository,
): Promise<ProductCatalog> {
  const catalog = await productRepository.getCatalog();
  catalog.applyTrainingStatus(modelRepository.getTrainedProductIds());
  return catalog;
}

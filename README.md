#  Try it live: https://juice-frontend-theta.vercel.app

🍹 JuiceShop - Fresh Juices Delivered in 30 Minutes
JuiceShop is a full-stack e-commerce platform that brings farm-fresh, healthy juices straight to your doorstep. With a 30-minute delivery guarantee, customers can browse a vibrant collection of detox, immunity-boosting, energy, and protein juices—all made from 100% natural ingredients with no preservatives.

The app offers a seamless shopping experience: users can filter juices by category and price, read real customer reviews with images, and save favorites to a wishlist. The intuitive checkout supports multiple payment methods including UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, QR code scanning, and Cash on Delivery via secure Razorpay integration.

Registered users enjoy personalized profiles with saved addresses, order tracking, and the ability to upload images when reviewing purchased products. An exclusive admin panel empowers store owners with comprehensive management tools—oversee orders, update statuses, manage inventory, moderate reviews, and track revenue through an interactive dashboard.

Built with React, Node.js, MongoDB, and Tailwind CSS, JuiceShop delivers a modern, responsive experience across all devices. Whether you're craving a morning detox or post-workout protein boost, JuiceShop makes healthy living just a click away.

## 🌐 Backend API Endpoints

### Public Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/juices` | Get all juices |
| GET | `/juices/search/filter` | Search/filter juices |
| GET | `/juices/:id` | Get single juice |
| GET | `/reviews/:juiceId` | Get juice reviews |

### User Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users/register` | Register new user |
| POST | `/users/login` | User login |
| POST | `/users/logout` | User logout |
| POST | `/users/forgot-password` | Forgot password |
| POST | `/users/reset-password/:token` | Reset password |
| GET | `/users/profile` | Get user profile |
| PATCH | `/users/profile` | Update profile |

### Cart Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cart` | Get user cart |
| POST | `/cart/add` | Add item to cart |
| PATCH | `/cart/update/:id` | Update quantity |
| DELETE | `/cart/remove/:juiceId` | Remove item |
| DELETE | `/cart/clear` | Clear cart |

### Order Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/orders/place` | Place order from cart |
| POST | `/orders/buy-now` | Direct buy |
| GET | `/orders/my-orders` | Get user orders |
| GET | `/orders/:id` | Get single order |
| PATCH | `/orders/cancelOrder/:id` | Cancel order |

### Wishlist Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/wishlists` | Get user wishlist |
| POST | `/wishlists/add/:juiceId` | Add to wishlist |
| DELETE | `/wishlists/:juiceId` | Remove from wishlist |
| DELETE | `/wishlists/clear` | Clear wishlist |

### Review Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/reviews/:juiceId` | Add review (with images) |
| PATCH | `/reviews/:id` | Update review |
| DELETE | `/reviews/:id` | Delete review |

### Payment Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payments/create-order` | Create Razorpay order |
| POST | `/payments/verify-payment` | Verify payment |
| GET | `/payments/payment-details/:paymentId` | Get payment details |

### Admin Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/dashboard` | Dashboard stats |
| GET | `/admin/users` | Get all users |
| PATCH | `/admin/users/:id/role` | Update user role |
| DELETE | `/admin/users/:id` | Delete user |
| GET | `/admin/orders` | Get all orders |
| PATCH | `/admin/orders/:id/status` | Update order status |
| GET | `/admin/juices` | Get all juices |
| POST | `/admin/juices` | Create juice |
| PATCH | `/admin/juices/:id` | Update juice |
| DELETE | `/admin/juices/:id` | Delete juice |
| GET | `/admin/reviews` | Get all reviews |
| DELETE | `/admin/reviews/:id` | Delete review |

🙏 Acknowledgments
Razorpay for payment gateway
Cloudinary for image storage
MongoDB Atlas for database
Render and Vercel for hosting
All the open-source libraries used in this project

📞 Contact
Project Link: https://github.com/yourusername/juice-backend
Live Demo: https://juice-frontend-theta.vercel.app


